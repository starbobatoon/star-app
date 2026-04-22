import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { synthesizeSpeech, FishAudioError } from "@/lib/fish-audio";

// ── POST /api/admin/voices/preview ─────────────────────────────────────────
// Generates a short audio preview of a Fish Audio voice.
// Admin auth required. Returns raw MP3 audio (audio/mpeg).

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

    // TODO: Add is_blocked check on user metadata when available
    // if (user.user_metadata?.is_blocked) {
    //   return NextResponse.json({ error: "Account is blocked" }, { status: 403 });
    // }

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

    // ── Synthesize audio via Fish Audio ────────────────────────────────────
    let audioBuffer: Buffer;
    try {
      audioBuffer = await synthesizeSpeech({
        text: previewText,
        voiceId: fishAudioVoiceId,
        format: "mp3",
      });
    } catch (err) {
      if (err instanceof FishAudioError) {
        console.error(
          `[voices.preview] Fish Audio error (${err.category}):`,
          err.message
        );
        return NextResponse.json(
          { error: `Voice synthesis failed: ${err.message}` },
          { status: 500 }
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