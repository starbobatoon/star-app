/**
 * @module pipeline
 * @description Speech pipeline orchestrator — runs the full pipeline:
 *   generate text → generate audio → sync to GHL → delivery notification
 *
 * Each stage is handled by its own module and updates speech status
 * independently. The orchestrator runs them sequentially and stops
 * on the first failure. Stage 4 (delivery) is non-fatal — a notification
 * failure does not block the speech from being marked complete.
 *
 * IMPORTANT: This module uses Node.js APIs and Supabase admin client — server-only.
 * Never import this from a client component.
 */

import "server-only";

import { generateSpeechText } from "@/lib/speech-generator";
import { generateSpeechAudio } from "@/lib/audio-generator";
import { syncSpeechToGHL } from "@/lib/ghl-sync";
import { notifyOnCompletion } from "@/lib/notify";
import { writeAuditLog } from "@/lib/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDefaultsIfNeeded } from "@/lib/seed-defaults";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineResult {
  success: boolean;
  completedAt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// runSpeechPipeline — orchestrates all 3 stages
// ---------------------------------------------------------------------------

/**
 * Runs the full speech pipeline for a given speech ID:
 *   1. Generate speech text (LLM → transcript + sections)
 *   2. Generate speech audio (transcript → Fish Audio TTS)
 *   3. Sync to GHL (contact upsert + media upload + workflow trigger)
 *   4. Delivery notification (email + SMS via GHL workflow / n8n webhook)
 *
 * Stages 1-3 are fatal — pipeline stops on first failure.
 * Stage 4 is non-fatal — notification failure is logged but does not
 * block the speech from being marked complete.
 *
 * @param speechId - UUID of the speech record to process
 * @returns PipelineResult with success flag, completion timestamp, and optional error
 */
export async function runSpeechPipeline(
  speechId: string
): Promise<PipelineResult> {
  console.log(`[pipeline] Starting pipeline for speech ${speechId}`);

  // Populate integration config from env vars on first run (idempotent)
  await seedDefaultsIfNeeded();

  // ── Stage 1: Generate text ──────────────────────────────────────────
  await writeAuditLog({
    action: "pipeline_stage_start",
    entityType: "speeches",
    entityId: speechId,
    afterValue: { stage: "generate_text", status: "started" },
  });

  const textResult = await generateSpeechText(speechId);

  if (!textResult.success) {
    console.error(
      `[pipeline] Text generation failed for speech ${speechId}: ${textResult.error}`
    );
    await writeAuditLog({
      action: "pipeline_stage_failed",
      entityType: "speeches",
      entityId: speechId,
      afterValue: { stage: "generate_text", error: textResult.error },
    });
    return {
      success: false,
      error: textResult.error ?? "Text generation failed",
    };
  }

  console.log(`[pipeline] Text generation complete for speech ${speechId}`);

  // ── Stage 2: Generate audio ─────────────────────────────────────────
  await writeAuditLog({
    action: "pipeline_stage_start",
    entityType: "speeches",
    entityId: speechId,
    afterValue: { stage: "generate_audio", status: "started" },
  });

  const audioResult = await generateSpeechAudio(speechId);

  if (!audioResult.success) {
    console.error(
      `[pipeline] Audio generation failed for speech ${speechId}: ${audioResult.error}`
    );
    await writeAuditLog({
      action: "pipeline_stage_failed",
      entityType: "speeches",
      entityId: speechId,
      afterValue: { stage: "generate_audio", error: audioResult.error },
    });
    return {
      success: false,
      error: audioResult.error ?? "Audio generation failed",
    };
  }

  console.log(`[pipeline] Audio generation complete for speech ${speechId}`);

  // ── Stage 3: Sync to GHL ────────────────────────────────────────────
  await writeAuditLog({
    action: "pipeline_stage_start",
    entityType: "speeches",
    entityId: speechId,
    afterValue: { stage: "sync_ghl", status: "started" },
  });

  const ghlResult = await syncSpeechToGHL(speechId);

  if (!ghlResult.success) {
    console.error(
      `[pipeline] GHL sync failed for speech ${speechId}: ${ghlResult.error}`
    );
    await writeAuditLog({
      action: "pipeline_stage_failed",
      entityType: "speeches",
      entityId: speechId,
      afterValue: { stage: "sync_ghl", error: ghlResult.error },
    });
    return {
      success: false,
      error: ghlResult.error ?? "GHL sync failed",
    };
  }

  console.log(`[pipeline] GHL sync complete for speech ${speechId}`);

  // ── Stage 4: Delivery notification ──────────────────────────────
  await writeAuditLog({
    action: "pipeline_stage_start",
    entityType: "speeches",
    entityId: speechId,
    afterValue: { stage: "delivery_notification", status: "started" },
  });

  try {
    const deliveryResult = await notifyOnCompletion(speechId);
    console.log(
      `[pipeline] Delivery notification complete for speech ${speechId}: email=${deliveryResult.email.success} sms=${deliveryResult.sms.success}`
    );
  } catch (deliveryErr) {
    // Delivery failure is non-fatal — speech is complete, notification is best-effort
    console.error(
      `[pipeline] Delivery notification failed for speech ${speechId}:`,
      deliveryErr
    );
  }

  // ── All stages succeeded ────────────────────────────────────────────
  const completedAt = new Date().toISOString();

  await writeAuditLog({
    action: "pipeline_complete",
    entityType: "speeches",
    entityId: speechId,
    afterValue: { completedAt },
  });

  // Mark the speech as complete in the database
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("speeches")
    .update({ status: "complete", completed_at: completedAt })
    .eq("id", speechId);

  if (updateError) {
    console.error(
      `[pipeline] Failed to mark speech ${speechId} as complete:`,
      updateError
    );
  }

  console.log(
    `[pipeline] Pipeline completed successfully for speech ${speechId} at ${completedAt}`
  );

  return { success: true, completedAt };
}