/**
 * @module notify
 * @description Post-completion delivery notifier — sends speech delivery
 * notifications to the user via available channels (email + SMS).
 *
 * Architecture:
 *   This module is called after the pipeline completes (after GHL sync).
 *   It checks what delivery channels are configured and dispatches
 *   notifications through the available paths:
 *
 *   - Email: Uses GHL workflow (email_workflow_id) if GHL is configured.
 *     Falls back to n8n webhook if configured.
 *   - SMS: Uses n8n webhook if configured (n8n handles the actual SMS
 *     provider integration, e.g. Twilio, Vonage, Telnyx).
 *
 *   If no channels are configured, the module logs this clearly and
 *   records the gap in the speech record and audit log.
 *
 * This module does NOT add new external dependencies. It reuses the
 * existing GHL and n8n infrastructure already in the repo.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeliveryStatus {
  email: {
    attempted: boolean;
    method?: "ghl_workflow" | "n8n_webhook";
    success: boolean;
    error?: string;
  };
  sms: {
    attempted: boolean;
    method?: "n8n_webhook";
    success: boolean;
    error?: string;
  };
}

// ---------------------------------------------------------------------------
// Main notification function (legacy — used by pipeline stage 4)
// ---------------------------------------------------------------------------

/**
 * Sends delivery notifications for a completed speech.
 *
 * Checks the ghl_integration config to determine available channels,
 * then dispatches email and SMS through whatever paths are configured.
 *
 * @param speechId - UUID of the completed speech
 * @returns DeliveryStatus for each channel
 */
export async function notifyOnCompletion(
  speechId: string
): Promise<DeliveryStatus> {
  const admin = createAdminClient();

  const status: DeliveryStatus = {
    email: { attempted: false, success: false },
    sms: { attempted: false, success: false },
  };

  // ── Read GHL integration config ──────────────────────────────────
  const { data: config, error: configError } = await admin
    .from("ghl_integration")
    .select(
      "id, pit_encrypted, location_id, email_workflow_id, n8n_webhook_url, n8n_enabled"
    )
    .limit(1)
    .maybeSingle();

  if (configError || !config) {
    console.log(
      `[notify] No GHL integration configured for speech ${speechId} — no delivery channels available`
    );
    await recordDelivery(admin, speechId, status);
    return status;
  }

  // ── Read speech record ───────────────────────────────────────────
  const { data: speech, error: speechError } = await admin
    .from("speeches")
    .select("id, first_name, last_name, email, phone, ghl_contact_id")
    .eq("id", speechId)
    .maybeSingle();

  if (speechError || !speech) {
    console.error(`[notify] Speech not found for delivery: ${speechId}`);
    return status;
  }

  // ── Email delivery ───────────────────────────────────────────────
  // Primary path: GHL workflow trigger (already done in ghl-sync.ts Stage 7)
  // Secondary path: n8n webhook for email if GHL workflow is not set
  if (config.email_workflow_id && config.pit_encrypted) {
    // GHL workflow was already triggered in ghl-sync.ts — record that it was handled there
    status.email.attempted = true;
    status.email.method = "ghl_workflow";
    status.email.success = true;
    console.log(
      `[notify] Email delivery handled via GHL workflow ${config.email_workflow_id} for speech ${speechId}`
    );
  } else if (config.n8n_enabled && config.n8n_webhook_url && speech.email) {
    // Fallback: n8n webhook can handle email sending
    status.email.attempted = true;
    status.email.method = "n8n_webhook";
    try {
      await dispatchToN8n(config.n8n_webhook_url, "email", speech);
      status.email.success = true;
      console.log(
        `[notify] Email delivery dispatched via n8n webhook for speech ${speechId}`
      );
    } catch (err) {
      status.email.error = err instanceof Error ? err.message : String(err);
      console.error(
        `[notify] Email delivery via n8n failed for speech ${speechId}:`,
        status.email.error
      );
    }
  } else {
    console.log(
      `[notify] No email channel configured for speech ${speechId} (no GHL workflow and no n8n webhook)`
    );
  }

  // ── SMS delivery ─────────────────────────────────────────────────
  // The only available path: n8n webhook (n8n integrates with Twilio/Vonage/etc.)
  if (config.n8n_enabled && config.n8n_webhook_url && speech.phone) {
    status.sms.attempted = true;
    status.sms.method = "n8n_webhook";
    try {
      await dispatchToN8n(config.n8n_webhook_url, "sms", speech);
      status.sms.success = true;
      console.log(
        `[notify] SMS delivery dispatched via n8n webhook for speech ${speechId}`
      );
    } catch (err) {
      status.sms.error = err instanceof Error ? err.message : String(err);
      console.error(
        `[notify] SMS delivery via n8n failed for speech ${speechId}:`,
        status.sms.error
      );
    }
  } else {
    console.log(
      `[notify] No SMS channel configured for speech ${speechId} (no n8n webhook or no phone on record)`
    );
  }

  // ── Record delivery status ───────────────────────────────────────
  await recordDelivery(admin, speechId, status);

  // ── Audit log ────────────────────────────────────────────────────
  await writeAuditLog({
    action: "delivery_notification",
    entityType: "speeches",
    entityId: speechId,
    afterValue: {
      emailAttempted: status.email.attempted,
      emailSuccess: status.email.success,
      emailMethod: status.email.method,
      smsAttempted: status.sms.attempted,
      smsSuccess: status.sms.success,
      smsMethod: status.sms.method,
    },
  });

  return status;
}

// ---------------------------------------------------------------------------
// sendDeliveryNotifications — primary entrypoint for /deliver endpoint
// ---------------------------------------------------------------------------

/**
 * Primary delivery notification entrypoint.
 *
 * Fetches the speech + ghl_integration config, upserts a GHL contact
 * with speech data and media URLs, triggers the GHL workflow if one
 * is configured, and falls back to an n8n POST webhook.  Finally
 * updates the speech `delivery_status` column with per-channel results.
 *
 * @param speechId - UUID of the completed speech
 * @returns `{ status, details }` where status is `"delivered"`,
 *          `"partial"`, or `"skipped"` and details contains per-channel
 *          breakdowns.
 */
export async function sendDeliveryNotifications(
  speechId: string
): Promise<{ status: string; details: any }> {
  const admin = createAdminClient();

  // 1. Fetch speech + ghl_integration
  const { data: speech, error: speechErr } = await admin
    .from("speeches")
    .select(
      "id, first_name, last_name, email, phone, ghl_contact_id, audio_ghl_url, pdf_ghl_url, status"
    )
    .eq("id", speechId)
    .maybeSingle();

  if (speechErr || !speech) {
    return { status: "skipped", details: { error: "Speech not found" } };
  }

  const { data: config, error: cfgErr } = await admin
    .from("ghl_integration")
    .select(
      "id, pit_encrypted, location_id, email_workflow_id, n8n_webhook_url, n8n_enabled"
    )
    .limit(1)
    .maybeSingle();

  if (cfgErr || !config) {
    const details = {
      email: { attempted: false, success: false, reason: "no_config" },
      sms: { attempted: false, success: false, reason: "no_config" },
    };
    await recordDelivery(admin, speechId, details as unknown as DeliveryStatus);
    return { status: "skipped", details };
  }

  const channelDetails: Record<string, any> = {
    email: { attempted: false, success: false },
    sms: { attempted: false, success: false },
  };

  // 2. GHL upsert contact with speech data / media URLs
  let contactId = speech.ghl_contact_id;
  if (config.pit_encrypted) {
    try {
      const { upsertByEmail } = await import("@/lib/ghl/contacts");
      const result = await upsertByEmail({
        email: speech.email,
        firstName: speech.first_name ?? undefined,
        lastName: speech.last_name ?? undefined,
        phone: speech.phone ?? undefined,
      });
      contactId = result.contactId;
      if (!speech.ghl_contact_id) {
        await admin
          .from("speeches")
          .update({ ghl_contact_id: contactId })
          .eq("id", speechId);
      }
    } catch (err) {
      console.error(
        "[notify.sendDeliveryNotifications] GHL upsert failed:",
        err
      );
    }
  }

  // 3. Trigger GHL workflow if id is set
  if (config.email_workflow_id && contactId && config.pit_encrypted) {
    channelDetails.email.attempted = true;
    try {
      const { triggerWorkflow } = await import("@/lib/ghl/workflows");
      await triggerWorkflow({
        workflowId: config.email_workflow_id,
        contactId,
      });
      channelDetails.email.success = true;
      channelDetails.email.method = "ghl_workflow";
    } catch (err) {
      channelDetails.email.error =
        err instanceof Error ? err.message : String(err);
      console.error(
        "[notify.sendDeliveryNotifications] GHL workflow failed:",
        channelDetails.email.error
      );
    }
  }

  // 4. Fallback: n8n POST webhook
  if (config.n8n_enabled && config.n8n_webhook_url) {
    // Email fallback — only if GHL workflow didn't succeed
    if (!channelDetails.email.success && speech.email) {
      channelDetails.email.attempted = true;
      try {
        await dispatchToN8n(config.n8n_webhook_url, "email", speech);
        channelDetails.email.success = true;
        channelDetails.email.method = "n8n_webhook";
      } catch (err) {
        channelDetails.email.error =
          err instanceof Error ? err.message : String(err);
      }
    }
    // SMS path
    if (speech.phone) {
      channelDetails.sms.attempted = true;
      try {
        await dispatchToN8n(config.n8n_webhook_url, "sms", speech);
        channelDetails.sms.success = true;
        channelDetails.sms.method = "n8n_webhook";
      } catch (err) {
        channelDetails.sms.error =
          err instanceof Error ? err.message : String(err);
      }
    }
  }

  // 5. Update speech delivery_status
  await recordDelivery(
    admin,
    speechId,
    channelDetails as unknown as DeliveryStatus
  );

  await writeAuditLog({
    action: "send_delivery_notifications",
    entityType: "speeches",
    entityId: speechId,
    afterValue: channelDetails,
  });

  const emailOk = channelDetails.email.success;
  const smsOk = channelDetails.sms.success;
  const overall = emailOk || smsOk
    ? emailOk && smsOk
      ? "delivered"
      : "partial"
    : "skipped";

  return { status: overall, details: channelDetails };
}

// ---------------------------------------------------------------------------
// n8n dispatch helper
// ---------------------------------------------------------------------------

/**
 * Sends a delivery notification request to the n8n webhook.
 *
 * The payload includes the notification type (email or sms) and the
 * speech data n8n needs to construct and send the message.
 * n8n is responsible for the actual provider integration (email via
 * SendGrid/Resend/SMTP, SMS via Twilio/Vonage/Telnyx).
 */
async function dispatchToN8n(
  webhookUrl: string,
  channel: "email" | "sms",
  speech: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    ghl_contact_id: string | null;
  }
): Promise<void> {
  const payload = {
    event: "speech_delivery",
    channel,
    speechId: speech.id,
    contact: {
      firstName: speech.first_name,
      lastName: speech.last_name,
      email: speech.email,
      phone: speech.phone,
      ghlContactId: speech.ghl_contact_id,
    },
    speechUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.starspeaker.com"}/speech/${speech.id}`,
    completedAt: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `n8n ${channel} dispatch failed (HTTP ${res.status}): ${body}`
    );
  }
}

// ---------------------------------------------------------------------------
// DB helper — record delivery status on speech record
// ---------------------------------------------------------------------------

/**
 * Writes delivery channel results to the speech record.
 * Uses JSONB column `delivery_status` on the speeches table.
 *
 * If the column doesn't exist yet (pre-migration), this fails silently
 * — delivery still works, just not persisted per-speech.
 */
async function recordDelivery(
  admin: ReturnType<typeof createAdminClient>,
  speechId: string,
  status: DeliveryStatus
): Promise<void> {
  const { error } = await admin
    .from("speeches")
    .update({
      delivery_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", speechId);

  if (error) {
    // Column might not exist yet — log but don't throw
    console.warn(
      `[notify] Could not persist delivery_status for speech ${speechId} (column may not exist):`,
      error.message
    );
  }
}
