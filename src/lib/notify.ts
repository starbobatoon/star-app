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
// Main notification function
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
