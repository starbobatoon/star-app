/**
 * @module audio-generator
 * @description Real implementation for speech audio generation using Fish Audio TTS.
 *
 * Flow:
 * 1. Fetches speech transcript from the speeches table
 * 2. Fetches Fish Audio config (api_key_encrypted, default_voice_id, volume, speed, tts_model, loudness_normalization, text_normalization)
 * 3. Decrypts API key
 * 4. Calls synthesizeSpeech() with all params
 * 5. Uploads audio buffer to Supabase storage bucket "speeches"
 * 6. Updates speech record with audio_url and status
 * 7. Writes audit log
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthesizeSpeech } from "@/lib/fish-audio";
import { decrypt } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit-log";

export interface GenerateResult {
  success: boolean;
  error?: string;
}

/**
 * Generates speech audio for a speech record using Fish Audio TTS.
 */
export async function generateSpeechAudio(
  speechId: string
): Promise<GenerateResult> {
  console.log(`[audio-generator] Generating audio for speech ${speechId}`);

  const supabaseAdmin = createAdminClient();

  try {
    // 1. Fetch speech transcript
    const { data: speech, error: speechError } = await supabaseAdmin
      .from("speeches")
      .select("transcript, voice_used")
      .eq("id", speechId)
      .single();

    if (speechError || !speech) {
      throw new Error(`Failed to fetch speech: ${speechError?.message || "Not found"}`);
    }

    if (!speech.transcript) {
      throw new Error("Speech transcript is empty");
    }

    // 2. Fetch Fish Audio config
    const { data: config, error: configError } = await supabaseAdmin
      .from("fish_audio_integration")
      .select("api_key_encrypted, default_voice_id, volume, speed, tts_model, loudness_normalization, text_normalization")
      .limit(1)
      .maybeSingle();

    if (configError) {
      throw new Error(`Failed to fetch Fish Audio config: ${configError.message}`);
    }

    if (!config?.api_key_encrypted) {
      throw new Error("Fish Audio API key not configured");
    }

    // 3. Decrypt API key
    const apiKey = decrypt(config.api_key_encrypted);

    // 4. Synthesize speech
    const voiceId = speech.voice_used || config.default_voice_id || "";
    if (!voiceId) {
      throw new Error("No voice ID configured for speech generation");
    }

    const audioBuffer = await synthesizeSpeech({
      text: speech.transcript,
      voiceId,
      format: "mp3",
      apiKey,
      model: config.tts_model || "s2-pro",
      volume: config.volume ?? 0,
      speed: config.speed ?? 1.0,
      loudnessNormalization: config.loudness_normalization ?? true,
      textNormalization: config.text_normalization ?? false,
    });

    // 5. Upload to Supabase storage bucket "speeches"
    const filePath = `${speechId}.mp3`;
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from("speeches")
      .upload(filePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from("speeches")
      .getPublicUrl(filePath);

    const audioUrl = publicUrlData?.publicUrl;

    // 6. Update speech record
    const { error: updateError } = await supabaseAdmin
      .from("speeches")
      .update({
        audio_url: audioUrl,
        status: "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", speechId);

    if (updateError) {
      throw new Error(`Failed to update speech record: ${updateError.message}`);
    }

    // 7. Write audit log
    await writeAuditLog({
      action: "audio_generated",
      entityType: "speech",
      entityId: speechId,
      beforeValue: { status: "generating_audio" },
      afterValue: { status: "complete", audio_url: audioUrl },
    });

    console.log(`[audio-generator] Audio generated successfully for speech ${speechId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[audio-generator] Error generating audio for ${speechId}:`, errorMsg);

    // Update speech status to failed
    try {
      await supabaseAdmin
        .from("speeches")
        .update({ status: "failed", error: errorMsg })
        .eq("id", speechId);

      await writeAuditLog({
        action: "audio_generation_failed",
        entityType: "speech",
        entityId: speechId,
        beforeValue: { status: "generating_audio" },
        afterValue: { status: "failed", error: errorMsg },
      });
    } catch (auditErr) {
      console.error(`[audio-generator] Failed to write failure audit:`, auditErr);
    }

    return { success: false, error: errorMsg };
  }
}
