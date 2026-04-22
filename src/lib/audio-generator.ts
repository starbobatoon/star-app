/**
 * @module audio-generator
 * @description Speech audio generation pipeline using Fish Audio S2 TTS.
 *
 * Reads a speech transcript and active voice from the database, synthesizes
 * audio via Fish Audio, uploads the MP3 to Supabase Storage, and updates
 * the speech record with URLs and status transitions.
 *
 * Status flow: generating_audio → uploading → syncing_ghl
 * On failure: status → 'failed' with error message.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { synthesizeSpeech, FishAudioError } from "@/lib/fish-audio";
import { writeAuditLog } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpeechRecord {
  id: string;
  transcript_with_tags: string | null;
  transcript_markdown: string | null;
  status: string;
}

interface VoiceRecord {
  id: string;
  fish_audio_voice_id: string;
  label: string;
  is_active: boolean;
}

export interface GenerateAudioResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Update the speech record's status and optional error message.
 */
async function updateSpeechStatus(
  speechId: string,
  status: string,
  error?: string
): Promise<void> {
  const adminClient = createAdminClient();
  const update: Record<string, unknown> = { status };
  if (error !== undefined) {
    update.error = error;
  }
  const { error: dbError } = await adminClient
    .from("speeches")
    .update(update)
    .eq("id", speechId);

  if (dbError) {
    console.error(
      `[audio-generator] Failed to update speech ${speechId} status to "${status}":`,
      dbError
    );
    // Don't throw — we don't want status-update failures to mask the original error
  }
}

/**
 * Ensure the Supabase Storage bucket exists. Creates it if missing.
 */
async function ensureStorageBucket(bucketName: string): Promise<void> {
  const adminClient = createAdminClient();

  const { data: buckets, error: listError } =
    await adminClient.storage.listBuckets();

  if (listError) {
    throw new Error(
      `Failed to list storage buckets: ${listError.message}`
    );
  }

  const exists = buckets.some((b) => b.name === bucketName);

  if (!exists) {
    const { error: createError } = await adminClient.storage.createBucket(
      bucketName,
      { public: true }
    );

    if (createError) {
      // Race condition: another process may have created it between list and create
      // Re-check before throwing
      const { data: recheck } = await adminClient.storage.listBuckets();
      const nowExists = recheck?.some((b) => b.name === bucketName);
      if (!nowExists) {
        throw new Error(
          `Failed to create storage bucket "${bucketName}": ${createError.message}`
        );
      }
    }
  }
}

/**
 * Get the public URL for a file in a public Supabase Storage bucket.
 */
function getPublicUrl(bucket: string, path: string): string {
  const adminClient = createAdminClient();
  const { data } = adminClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Generate speech audio for a given speech record.
 *
 * Pipeline steps:
 *  1. Read speech transcript from DB
 *  2. Read active voice from DB
 *  3. Synthesize audio via Fish Audio S2
 *  4. Upload MP3 to Supabase Storage
 *  5. Update speech record with audio_url, audio_storage_path
 *  6. Transition status to 'syncing_ghl'
 *
 * @param speechId - UUID of the speech record to generate audio for.
 * @returns Result indicating success or failure with an optional error message.
 */
export async function generateSpeechAudio(
  speechId: string
): Promise<GenerateAudioResult> {
  const adminClient = createAdminClient();
  const BUCKET_NAME = "speech-audio";

  // -----------------------------------------------------------------------
  // Step 1: Read the speech transcript
  // -----------------------------------------------------------------------
  const { data: speech, error: speechError } = await adminClient
    .from("speeches")
    .select("id, transcript_with_tags, transcript_markdown, status")
    .eq("id", speechId)
    .single();

  if (speechError || !speech) {
    return {
      success: false,
      error: `Speech record not found: ${speechError?.message ?? "unknown error"}`,
    };
  }

  // Prefer transcript_with_tags (includes Fish Audio inline tags for expressiveness)
  // Fall back to transcript_markdown if tags version is not available
  const transcriptText =
    (speech as SpeechRecord).transcript_with_tags ??
    (speech as SpeechRecord).transcript_markdown;

  if (!transcriptText) {
    await updateSpeechStatus(speechId, "failed", "No transcript text available");
    return { success: false, error: "No transcript text available" };
  }

  // -----------------------------------------------------------------------
  // Step 2: Read the active voice
  // -----------------------------------------------------------------------
  const { data: voices, error: voiceError } = await adminClient
    .from("voices")
    .select("id, fish_audio_voice_id, label, is_active")
    .eq("is_active", true)
    .limit(1);

  if (voiceError) {
    await updateSpeechStatus(speechId, "failed", `Voice lookup error: ${voiceError.message}`);
    return { success: false, error: `Voice lookup error: ${voiceError.message}` };
  }

  if (!voices || voices.length === 0) {
    await updateSpeechStatus(speechId, "failed", "No active voice configured");
    return { success: false, error: "No active voice configured" };
  }

  const activeVoice = voices[0] as VoiceRecord;

  // -----------------------------------------------------------------------
  // Step 3: Synthesize audio via Fish Audio S2
  // -----------------------------------------------------------------------
  await updateSpeechStatus(speechId, "generating_audio");

  let audioBuffer: Buffer;

  try {
    audioBuffer = await synthesizeSpeech({
      text: transcriptText,
      voiceId: activeVoice.fish_audio_voice_id,
      format: "mp3",
    });
  } catch (err) {
    const message =
      err instanceof FishAudioError
        ? `Fish Audio error (${err.category}): ${err.message}`
        : `Audio synthesis failed: ${err instanceof Error ? err.message : String(err)}`;

    await updateSpeechStatus(speechId, "failed", message);
    await writeAuditLog({
      action: "generate_audio_failed",
      entityType: "speeches",
      entityId: speechId,
      afterValue: { error: message, voiceId: activeVoice.fish_audio_voice_id },
    });

    return { success: false, error: message };
  }

  // -----------------------------------------------------------------------
  // Step 4: Upload to Supabase Storage
  // -----------------------------------------------------------------------
  await updateSpeechStatus(speechId, "uploading");

  try {
    await ensureStorageBucket(BUCKET_NAME);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to ensure storage bucket";
    await updateSpeechStatus(speechId, "failed", message);
    return { success: false, error: message };
  }

  const storagePath = `speeches/${speechId}.mp3`;

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(storagePath, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true, // allow re-generation
    });

  if (uploadError) {
    const message = `Storage upload failed: ${uploadError.message}`;
    await updateSpeechStatus(speechId, "failed", message);
    return { success: false, error: message };
  }

  const publicUrl = getPublicUrl(BUCKET_NAME, storagePath);

  // -----------------------------------------------------------------------
  // Step 5: Update the speech record with audio metadata
  // -----------------------------------------------------------------------
  const { error: updateError } = await adminClient
    .from("speeches")
    .update({
      audio_ghl_url: publicUrl,
      audio_storage_path: storagePath,
      voice_used: activeVoice.fish_audio_voice_id,
    })
    .eq("id", speechId);

  if (updateError) {
    const message = `Failed to update speech audio metadata: ${updateError.message}`;
    await updateSpeechStatus(speechId, "failed", message);
    return { success: false, error: message };
  }

  // -----------------------------------------------------------------------
  // Step 6: Transition to syncing_ghl
  // -----------------------------------------------------------------------
  await updateSpeechStatus(speechId, "syncing_ghl");

  await writeAuditLog({
    action: "generate_audio_complete",
    entityType: "speeches",
    entityId: speechId,
    afterValue: {
      audio_ghl_url: publicUrl,
      audio_storage_path: storagePath,
      voice_used: activeVoice.fish_audio_voice_id,
      voice_label: activeVoice.label,
    },
  });

  return { success: true };
}