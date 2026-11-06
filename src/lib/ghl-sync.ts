/**
 * @module ghl-sync
 * @description GHL integration pipeline — syncs speech data to GoHighLevel
 * after a speech is generated. Creates/updates contacts, sets custom fields,
 * triggers workflows, and optionally calls n8n webhooks.
 *
 * IMPORTANT: Server-only. Uses admin Supabase client and Node.js crypto.
 *
 * Flow:
 *   1. Read GHL config from ghl_integration table
 *   2. If GHL not configured (no row or empty token), skip → status complete
 *   3. Decrypt PIT from DB
 *   4. Read speech record
 *   5. Read field mappings from ghl_field_mappings
 *   6. Upsert GHL contact (firstName, lastName, email, phone)
 *   7. Set custom fields on contact using field mappings
 *   8. Trigger GHL workflow if configured
 *   9. Call n8n webhook if enabled
 *  10. Update speech status: syncing_ghl → complete
 *
 * GHL failures do NOT block the user from seeing their speech.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { upsertByEmail } from "@/lib/ghl/contacts";
import { listCustomFields } from "@/lib/ghl/customFields";
import { triggerWorkflow } from "@/lib/ghl/workflows";
import { getGhlBaseUrl } from "@/lib/ghl/auth";
import { writeAuditLog } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GhlIntegrationRow {
  id: string;
  pit_encrypted: string;
  location_id: string;
  workflow_id: string | null;
  email_workflow_id: string | null;
  n8n_webhook_url: string | null;
  n8n_enabled: boolean;
}

interface GhlFieldMappingRow {
  id: string;
  star_app_field: string;
  ghl_custom_field_id: string | null;
  ghl_custom_field_name: string | null;
  ghl_custom_field_type: string | null;
}

interface SpeechRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  ghl_contact_id: string | null;
  answers: Record<string, unknown> | null;
  transcript_markdown: string | null;
  hook: string | null;
  story: string | null;
  point: string | null;
  cta: string | null;
  exit: string | null;
  word_count: number | null;
  voice_used: string | null;
  pdf_ghl_url: string | null;
  audio_ghl_url: string | null;
  status: string;
}

export interface SyncResult {
  success: boolean;
  contactId?: string;
  contactCreated?: boolean;
  error?: string;
  /** True when GHL is not configured and the sync was skipped by design. */
  skipped?: boolean;
  /**
   * Whether retrying could plausibly succeed. Momentary outages
   * (network, GHL 5xx, DB blips) are retryable; a broken stored
   * credential is not.
   */
  retryable?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a flat map of STAR App data fields to their values,
 * derived from the speech record. The keys must match the
 * ghl_field_mappings.star_data_key values.
 */
function buildSpeechFieldValues(speech: SpeechRow): Record<string, string> {
  const values: Record<string, string> = {};

  // Top-level speech fields
  if (speech.audio_ghl_url) values.audio_url = speech.audio_ghl_url;
  if (speech.pdf_ghl_url) values.pdf_url = speech.pdf_ghl_url;
  if (speech.word_count != null) values.word_count = String(speech.word_count);
  if (speech.voice_used) values.voice_used = speech.voice_used;
  values.speech_id = speech.id;
  values.generation_status = speech.status === "complete" ? "complete" : speech.status;

  // Extract answer fields from the answers JSONB
  // The answers object uses keys like q1, q2, ... q10
  // We map them to the star_data_key format: q1_message, q2_audience, etc.
  const answerKeyToFieldKey: Record<string, string> = {
    q1: "q1_message",
    q2: "q2_audience",
    q3: "q3_outcome",
    q4: "q4_story",
    q5: "q5_lesson",
    q6: "q6_signature",
    q7: "q7_hook",
    q8: "q8_cta",
    q9: "q9_exit",
    q10: "q10_context",
  };

  if (speech.answers && typeof speech.answers === "object") {
    for (const [answerKey, fieldKey] of Object.entries(answerKeyToFieldKey)) {
      const value = speech.answers[answerKey];
      if (value != null) {
        values[fieldKey] = String(value);
      }
    }
  }

  // Generated speech sections
  if (speech.hook) values.q7_hook = speech.hook;
  if (speech.story) values.q4_story = speech.story;
  if (speech.point) values.q5_lesson = speech.point;
  if (speech.cta) values.q8_cta = speech.cta;
  if (speech.exit) values.q9_exit = speech.exit;

  // Generation date
  values.generated_at = new Date().toISOString();

  return values;
}

/**
 * Sets custom fields on a GHL contact by patching the contact with
 * the customFields payload. This uses the GHL contacts API directly
 * since we already have the PIT from the integration config.
 */
async function setCustomFieldsOnContact(
  contactId: string,
  customFields: Record<string, string>,
  pit: string,
  locationId: string
): Promise<void> {
  if (!customFields || Object.keys(customFields).length === 0) return;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pit}`,
    Version: "2021-04-15",
    "Content-Type": "application/json",
  };

  const url = `https://services.leadconnectorhq.com/contacts/${encodeURIComponent(contactId)}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ customFields }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GHL custom fields update failed for contact ${contactId} (HTTP ${res.status}): ${body}`
    );
  }
}

/**
 * Sends a summary payload to the n8n webhook URL.
 */
async function callN8nWebhook(
  webhookUrl: string,
  speech: SpeechRow,
  contactId: string
): Promise<void> {
  const payload = {
    event: "speech_complete",
    speechId: speech.id,
    contactId,
    email: speech.email,
    firstName: speech.first_name,
    lastName: speech.last_name,
    hook: speech.hook,
    story: speech.story,
    point: speech.point,
    cta: speech.cta,
    exit: speech.exit,
    wordCount: speech.word_count,
    pdfUrl: speech.pdf_ghl_url,
    audioUrl: speech.audio_ghl_url,
    completedAt: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Log but don't throw — n8n webhook failure is non-critical
    console.error(
      `[ghl-sync] n8n webhook call failed (HTTP ${res.status}): ${await res.text()}`
    );
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Syncs a completed speech to GoHighLevel: upserts the contact,
 * sets custom fields, triggers the configured workflow, and optionally
 * calls the n8n webhook.
 *
 * - If GHL is not configured (no row or empty encrypted token), the speech
 *   status is set to "complete" directly — GHL sync is skipped gracefully.
 * - If any GHL step fails, the speech itself still completes (the sync
 *   never fails the speech); the failure is recorded in the speech's
 *   ghl_sync_* fields with a retry time, and the caller decides whether
 *   to retry (the pipeline retries with backoff; an admin can also
 *   retry via POST /api/speeches/[id]/ghl-sync/retry).
 *
 * @param speechId - The UUID of the speech to sync.
 * @returns A result object with success status and optional error details.
 */
export async function syncSpeechToGHL(
  speechId: string
): Promise<SyncResult> {
  const adminClient = createAdminClient();

  // -----------------------------------------------------------------------
  // 1. Read GHL integration config
  // -----------------------------------------------------------------------
  const { data: ghlConfig, error: configError } = await adminClient
    .from("ghl_integration")
    .select(
      "id, pit_encrypted, location_id, workflow_id, email_workflow_id, n8n_webhook_url, n8n_enabled"
    )
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error("[ghl-sync] Failed to read GHL config:", configError);
    // Don't block — mark speech complete
    await updateSpeechStatus(adminClient, speechId, "complete");
    await recordGhlSyncState(adminClient, speechId, {
      status: "failed",
      error: `GHL config read error: ${configError.message}`,
      countAttempt: true,
    });
    return {
      success: false,
      retryable: true,
      error: `GHL config read error: ${configError.message}`,
    };
  }

  // No GHL config row or no encrypted token → not configured, skip gracefully
  if (!ghlConfig || !ghlConfig.pit_encrypted) {
    console.log("[ghl-sync] GHL not configured, skipping sync for speech", speechId);
    await updateSpeechStatus(adminClient, speechId, "complete");
    await recordGhlSyncState(adminClient, speechId, { status: "skipped" });
    return { success: true, skipped: true, error: "GHL not configured — skipped" };
  }

  // -----------------------------------------------------------------------
  // 2. Decrypt PIT
  // -----------------------------------------------------------------------
  let pit: string;
  try {
    pit = decrypt(ghlConfig.pit_encrypted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ghl-sync] PIT decryption failed:", msg);
    await updateSpeechStatus(adminClient, speechId, "complete");
    await recordGhlSyncState(adminClient, speechId, {
      status: "failed",
      error: `PIT decryption failed: ${msg}`,
      countAttempt: true,
    });
    return {
      success: false,
      retryable: false,
      error: `PIT decryption failed: ${msg}`,
    };
  }

  if (!pit) {
    console.error("[ghl-sync] Decrypted PIT is empty");
    await updateSpeechStatus(adminClient, speechId, "complete");
    await recordGhlSyncState(adminClient, speechId, {
      status: "failed",
      error: "Decrypted PIT is empty",
      countAttempt: true,
    });
    return { success: false, retryable: false, error: "Decrypted PIT is empty" };
  }

  const locationId = ghlConfig.location_id;

  // -----------------------------------------------------------------------
  // 3. Read speech record
  // -----------------------------------------------------------------------
  const { data: speech, error: speechError } = await adminClient
    .from("speeches")
    .select(
      "id, first_name, last_name, email, phone, ghl_contact_id, answers, transcript_markdown, hook, story, point, cta, exit, word_count, voice_used, pdf_ghl_url, audio_ghl_url, status"
    )
    .eq("id", speechId)
    .maybeSingle();

  if (speechError || !speech) {
    const msg = speechError?.message || "Speech not found";
    console.error("[ghl-sync] Failed to read speech:", msg);
    await updateSpeechStatus(adminClient, speechId, "complete");
    await recordGhlSyncState(adminClient, speechId, {
      status: "failed",
      error: `Speech read error: ${msg}`,
      countAttempt: true,
    });
    return { success: false, retryable: true, error: `Speech read error: ${msg}` };
  }

  // -----------------------------------------------------------------------
  // 4. Read field mappings
  // -----------------------------------------------------------------------
  const { data: fieldMappings, error: mappingError } = await adminClient
    .from("ghl_field_mappings")
    .select(
      "id, star_app_field, ghl_custom_field_id, ghl_custom_field_name, ghl_custom_field_type"
    );

  if (mappingError) {
    console.error("[ghl-sync] Failed to read field mappings:", mappingError);
    // Continue without custom fields — contact upsert still works
  }

  // Filter to only mappings with a GHL custom field ID configured
  const activeMappings = (fieldMappings ?? []).filter(
    (m: GhlFieldMappingRow) => m.ghl_custom_field_id != null && m.ghl_custom_field_id !== ""
  );

  // -----------------------------------------------------------------------
  // 5. Upsert GHL contact
  // -----------------------------------------------------------------------
  // We must set status to syncing_ghl BEFORE calling GHL
  await updateSpeechStatus(adminClient, speechId, "syncing_ghl");
  await recordGhlSyncState(adminClient, speechId, {
    status: "pending",
    countAttempt: true,
  });

  let contactId: string;
  let contactCreated: boolean;

  try {
    const result = await upsertByEmail({
      email: speech.email,
      firstName: speech.first_name ?? undefined,
      lastName: speech.last_name ?? undefined,
      phone: speech.phone ?? undefined,
      locationId: locationId ?? undefined,
    });

    contactId = result.contactId;
    contactCreated = result.created;

    // Store the GHL contact ID back on the speech record
    await adminClient
      .from("speeches")
      .update({
        ghl_contact_id: contactId,
        ghl_contact_created: contactCreated,
      })
      .eq("id", speechId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ghl-sync] Contact upsert failed:", msg);
    await updateSpeechStatus(adminClient, speechId, "complete");
    await recordGhlSyncState(adminClient, speechId, {
      status: "failed",
      error: `Contact upsert failed: ${msg}`,
    });
    await writeAuditLog({
      action: "sync_ghl_failed",
      entityType: "speeches",
      entityId: speechId,
      afterValue: { step: "contact_upsert", error: msg },
    });
    return {
      success: false,
      retryable: true,
      error: `Contact upsert failed: ${msg}`,
    };
  }

  // -----------------------------------------------------------------------
  // 6. Set custom fields on the contact
  // -----------------------------------------------------------------------
  try {
    const speechFieldValues = buildSpeechFieldValues(speech as SpeechRow);

    // Build the customFields payload: map each star_data_key to its
    // GHL custom field ID, using the value from the speech data
    const customFieldsPayload: Record<string, string> = {};
    for (const mapping of activeMappings) {
      const value = speechFieldValues[mapping.star_app_field];
      if (value != null) {
        customFieldsPayload[mapping.ghl_custom_field_id!] = value;
      }
    }

    if (Object.keys(customFieldsPayload).length > 0) {
      await setCustomFieldsOnContact(
        contactId,
        customFieldsPayload,
        pit,
        locationId
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ghl-sync] Custom fields update failed:", msg);
    // Non-fatal — contact is created, just missing custom fields
    // We still continue to workflow trigger
    await writeAuditLog({
      action: "sync_ghl_partial",
      entityType: "speeches",
      entityId: speechId,
      afterValue: { step: "custom_fields", error: msg, contactId },
    });
  }

  // -----------------------------------------------------------------------
  // 7. Trigger GHL workflow if configured
  // -----------------------------------------------------------------------
  const activeWorkflowId = ghlConfig.workflow_id || ghlConfig.email_workflow_id;
  if (activeWorkflowId) {
    try {
      await triggerWorkflow({
        contactId,
        workflowId: activeWorkflowId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ghl-sync] Workflow trigger failed:", msg);
      // Non-fatal — contact is created with custom fields
      await writeAuditLog({
        action: "sync_ghl_partial",
        entityType: "speeches",
        entityId: speechId,
        afterValue: { step: "workflow_trigger", error: msg, contactId },
      });
    }
  }

  // -----------------------------------------------------------------------
  // 8. Call n8n webhook if enabled
  // -----------------------------------------------------------------------
  if (ghlConfig.n8n_enabled && ghlConfig.n8n_webhook_url) {
    try {
      await callN8nWebhook(ghlConfig.n8n_webhook_url, speech as SpeechRow, contactId);
    } catch (err) {
      // Already logged inside callN8nWebhook — non-fatal
    }
  }

  // -----------------------------------------------------------------------
  // 9. Mark speech as complete
  // -----------------------------------------------------------------------
  await updateSpeechStatus(adminClient, speechId, "complete");
  await recordGhlSyncState(adminClient, speechId, { status: "synced" });

  await writeAuditLog({
    action: "sync_ghl_complete",
    entityType: "speeches",
    entityId: speechId,
    afterValue: {
      contactId,
      contactCreated,
      customFieldCount: activeMappings.length,
      workflowTriggered: !!ghlConfig.email_workflow_id,
      n8nCalled: !!(ghlConfig.n8n_enabled && ghlConfig.n8n_webhook_url),
    },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

async function updateSpeechStatus(
  client: ReturnType<typeof createAdminClient>,
  speechId: string,
  status: string
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === "complete") {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await client
    .from("speeches")
    .update(update)
    .eq("id", speechId);

  if (error) {
    console.error(`[ghl-sync] Failed to update speech ${speechId} status to ${status}:`, error);
  }
}

/**
 * Records the durable GHL sync state (status, attempt count, last
 * error, next retry time) in the ghl_sync_* columns added by
 * migration 014. This is what makes a failed sync visible and
 * retryable instead of silently lost.
 *
 * Tolerant by design: if the columns do not exist yet (migration
 * not applied), the read fails and recording is skipped — the sync
 * itself, and the speech, are unaffected.
 */
async function recordGhlSyncState(
  client: ReturnType<typeof createAdminClient>,
  speechId: string,
  state: {
    status: "pending" | "synced" | "failed" | "skipped";
    error?: string;
    countAttempt?: boolean;
  }
): Promise<void> {
  try {
    const { data, error: readError } = await client
      .from("speeches")
      .select("ghl_sync_attempts")
      .eq("id", speechId)
      .maybeSingle();

    if (readError) {
      // Columns missing (pre-migration) or unreadable — skip recording.
      return;
    }

    const now = new Date();
    const update: Record<string, unknown> = {
      ghl_sync_status: state.status,
      ghl_sync_last_error: state.error ?? null,
      ghl_sync_next_attempt_at:
        state.status === "failed"
          ? new Date(now.getTime() + 15 * 60 * 1000).toISOString()
          : null,
    };
    if (state.countAttempt) {
      update.ghl_sync_attempts = (data?.ghl_sync_attempts ?? 0) + 1;
    }
    if (state.status === "synced") {
      update.ghl_synced_at = now.toISOString();
    }

    const { error: updateError } = await client
      .from("speeches")
      .update(update)
      .eq("id", speechId);

    if (updateError) {
      console.error(
        `[ghl-sync] Failed to record sync state for speech ${speechId}:`,
        updateError
      );
    }
  } catch (err) {
    console.error(
      `[ghl-sync] recordGhlSyncState failed for speech ${speechId}:`,
      err
    );
  }
}