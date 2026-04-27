import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";

// In-memory flag — prevents redundant DB checks within the same server process.
// Cold starts will re-check, which is intentional (idempotent).
let seeded = false;

/**
 * Populates integration config tables from environment variables if the DB
 * rows are empty. Runs at most once per process. Admin UI changes take
 * precedence because we only seed when a field is absent.
 *
 * Env vars consumed:
 *   FISH_AUDIO_API_KEY   — Fish Audio secret key
 *   FISH_AUDIO_VOICE_ID  — Default voice / active voice ID
 *   OPENROUTER_API_KEY   — OpenRouter secret key
 *   GHL_LOCATION_ID      — GoHighLevel location ID
 *   GHL_PIT              — GoHighLevel private integration token
 */
export async function seedDefaultsIfNeeded(): Promise<void> {
  if (seeded) return;

  try {
    const admin = createAdminClient();

    // ------------------------------------------------------------------
    // Fish Audio
    // ------------------------------------------------------------------
    const fishApiKey = process.env.FISH_AUDIO_API_KEY;
    const fishVoiceId = process.env.FISH_AUDIO_VOICE_ID;

    if (fishApiKey || fishVoiceId) {
      const { data: fishRow } = await admin
        .from("fish_audio_integration")
        .select("id, api_key_encrypted, default_voice_id")
        .limit(1)
        .maybeSingle();

      const fishUpdate: Record<string, unknown> = {};
      if (fishApiKey && !fishRow?.api_key_encrypted) {
        fishUpdate.api_key_encrypted = encrypt(fishApiKey);
        fishUpdate.api_key_preview = fishApiKey.slice(-4);
        fishUpdate.is_configured = true;
      }
      if (fishVoiceId && !fishRow?.default_voice_id) {
        fishUpdate.default_voice_id = fishVoiceId;
      }

      if (Object.keys(fishUpdate).length > 0) {
        if (fishRow?.id) {
          await admin.from("fish_audio_integration").update(fishUpdate).eq("id", fishRow.id);
        } else {
          await admin.from("fish_audio_integration").insert(fishUpdate);
        }
      }

      // Seed voices table if no active voice exists
      if (fishVoiceId) {
        const { data: activeVoice } = await admin
          .from("voices")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!activeVoice) {
          await admin.from("voices").insert({
            fish_audio_voice_id: fishVoiceId,
            label: "Star Bobatoon",
            is_active: true,
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // OpenRouter
    // ------------------------------------------------------------------
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (openrouterKey) {
      const { data: orRow } = await admin
        .from("openrouter_integration")
        .select("id, api_key_encrypted")
        .limit(1)
        .maybeSingle();

      if (!orRow?.api_key_encrypted) {
        const orUpdate = {
          api_key_encrypted: encrypt(openrouterKey),
          api_key_preview: openrouterKey.slice(-4),
          is_configured: true,
        };
        if (orRow?.id) {
          await admin.from("openrouter_integration").update(orUpdate).eq("id", orRow.id);
        } else {
          await admin.from("openrouter_integration").insert(orUpdate);
        }
      }
    }

    // ------------------------------------------------------------------
    // GoHighLevel
    // ------------------------------------------------------------------
    const ghlLocationId = process.env.GHL_LOCATION_ID;
    const ghlPit = process.env.GHL_PIT;

    if (ghlLocationId || ghlPit) {
      const { data: ghlRow } = await admin
        .from("ghl_integration")
        .select("id, pit_encrypted, location_id")
        .limit(1)
        .maybeSingle();

      const ghlUpdate: Record<string, unknown> = {};
      if (ghlPit && !ghlRow?.pit_encrypted) {
        ghlUpdate.pit_encrypted = encrypt(ghlPit);
        ghlUpdate.pit_preview = ghlPit.slice(-4);
        ghlUpdate.is_configured = true;
      }
      if (ghlLocationId && !ghlRow?.location_id) {
        ghlUpdate.location_id = ghlLocationId;
      }

      if (Object.keys(ghlUpdate).length > 0) {
        if (ghlRow?.id) {
          await admin.from("ghl_integration").update(ghlUpdate).eq("id", ghlRow.id);
        } else {
          await admin.from("ghl_integration").insert(ghlUpdate);
        }
      }
    }

    seeded = true;
  } catch (err) {
    // Non-fatal — log and continue. The service files have their own error handling.
    console.error("[seed-defaults] Failed to seed defaults:", err);
  }
}
