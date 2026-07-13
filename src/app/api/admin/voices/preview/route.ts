import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthesizeSpeech, FishAudioError } from "@/lib/fish-audio";
import { decrypt } from "@/lib/encryption";
import { isAdmin } from "@/lib/auth-check";

// ── POST /api/admin/voices/preview ─────────────────────────────────────────
// Generates a short audio preview of a Fish Audio voice.
// Admin auth required. Returns raw MP3 audio (audio/mpeg).
// Fetches the API key from the encrypted fish_audio_integration config.

const previewSchema = z.object({
  fishAudioVoiceId: z.string().min(1, "fishAudioVoiceId is required"),
  text: z.string().optional(),
});

const DEFAULT_PREVIEW_TEXT =
  "This is a preview of the selected voice for your STAR speeches.";

export async function POST(request: Request) {
  try {
    // ── Admin auth: verify authenticated user ─────────────────────────────
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // ── Parse and validate request body ───────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { fishAudioVoiceId, text } = parsed.data;
    const previewText = text?.trim() || DEFAULT_PREVIEW_TEXT;

    // ── Fetch Fish Audio API key from encrypted DB config ─────────────────
    let apiKey: string | undefined;
    let integration: {
      api_key_encrypted: string | null;
      default_voice_id: string | null;
      volume: number | null;
      speed: number | null;
      tts_model: string | null;
      loudness_normalization: boolean | null;
      text_normalization: boolean | null;
    } | null = null;
    try {
      const admin = createAdminClient();
      const { data: integData, error: integError } = await admin
        .from("fish_audio_integration")
        .select("api_key_encrypted, default_voice_id, volume, speed, tts_model, loudness_normalization, text_normalization")
        .limit(1)
        .maybeSingle();

      integration = integData;

      if (integError) {
        console.error(
          "[voices.preview] Failed to fetch integration config:",
          integError
        );
      } else if (integration?.api_key_encrypted) {
        try {
          apiKey = decrypt(integration.api_key_encrypted);
        } catch (decryptErr) {
          console.error(
            "[voices.preview] Failed to decrypt API key:",
            decryptErr
          );
        }
      }
    } catch (fetchErr) {
      console.error(
        "[voices.preview] Failed to load Fish Audio config:",
        fetchErr
      );
    }

    // ── Synthesize audio via Fish Audio ────────────────────────────────────
    let audioBuffer: Buffer;
    try {
      audioBuffer = await synthesizeSpeech({
        text: previewText,
        voiceId: fishAudioVoiceId,
        format: "mp3",
        apiKey,
        model: integration?.tts_model || "s2.1-pro",
        volume: integration?.volume ?? 0,
        speed: integration?.speed ?? 1.0,
        loudnessNormalization: integration?.loudness_normalization ?? true,
        textNormalization: integration?.text_normalization ?? false,
      });
    } catch (err) {
      if (err instanceof FishAudioError) {
        console.error(
          `[voices.preview] Fish Audio error (${err.category}):`,
          err.message
        );

        // Map error categories to appropriate HTTP status codes
        const statusMap: Record<string, number> = {
          auth: 401,
          rate_limit: 429,
          voice_invalid: 400,
          api: 502,
          network: 502,
        };
        const httpStatus = statusMap[err.category] ?? 500;

        return NextResponse.json(
          {
            error: err.message,
            category: err.category,
          },
          { status: httpStatus }
        );
      }

      console.error("[voices.preview] Unexpected synthesis error:", err);
      return NextResponse.json(
        { error: "Voice synthesis failed" },
        { status: 500 }
      );
    }

    // ── Return raw MP3 audio ──────────────────────────────────────────────
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const audioArray = new Uint8Array(audioBuffer);
    return new NextResponse(audioArray, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioArray.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[voices.preview] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
