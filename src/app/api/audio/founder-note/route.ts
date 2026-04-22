/**
 * @module founder-note-api
 * @description API endpoint for generating founder audio notes via Fish Audio TTS.
 *
 * POST /api/audio/founder-note
 * Body: { text: string }
 * Returns: { success: true, url: string }
 *
 * Uses the existing Fish Audio S2 TTS integration and uploads the MP3
 * to the Supabase storage bucket 'webinar-assets/founder-note.mp3'.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthesizeSpeech, FishAudioError } from "@/lib/fish-audio";

// ─── Validation ────────────────────────────────────────────────────

const requestBodySchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(5000, "Text must be 5000 characters or fewer"),
});

// ─── Constants ─────────────────────────────────────────────────────

const BUCKET_NAME = "webinar-assets";
const STORAGE_PATH = "founder-note.mp3";
const VOICE_ID = process.env.FISH_AUDIO_VOICE_ID || "e75e1618ff544059be71409c5126b4c0";

// ─── Rate Limiting (simple in-memory) ──────────────────────────────

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10_000; // 10 seconds between requests per IP

function isRateLimited(ip: string): boolean {
  const last = rateLimitMap.get(ip);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_MS) {
    return true;
  }
  rateLimitMap.set(ip, now);
  return false;
}

// ─── POST Handler ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Rate limiting ──
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limited. Please wait before making another request." },
        { status: 429 }
      );
    }

    // ── Parse & validate body ──
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = requestBodySchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { text } = parsed.data;

    // ── Synthesize speech via Fish Audio ──
    console.log("[founder-note] Synthesizing speech via Fish Audio...");
    let audioBuffer: Buffer;
    try {
      audioBuffer = await synthesizeSpeech({
        text,
        voiceId: VOICE_ID,
        format: "mp3",
        model: "s2-pro",
        speed: 1.05,
      });
    } catch (err) {
      if (err instanceof FishAudioError) {
        console.error("[founder-note] Fish Audio error:", err.category, err.message);

        if (err.category === "rate_limit") {
          return NextResponse.json(
            { error: "TTS rate limit exceeded. Please try again in a moment." },
            { status: 429 }
          );
        }
        if (err.category === "auth") {
          return NextResponse.json(
            { error: "TTS authentication failed. Check Fish Audio API key." },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: `TTS synthesis failed: ${err.message}` },
          { status: 500 }
        );
      }
      throw err;
    }

    console.log(`[founder-note] Audio synthesized: ${audioBuffer.length} bytes`);

    // ── Upload to Supabase Storage ──
    const admin = createAdminClient();

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      console.log(`[founder-note] Creating bucket '${BUCKET_NAME}'...`);
      const { error: createError } = await admin.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      if (createError) {
        console.error("[founder-note] Failed to create bucket:", createError);
        return NextResponse.json(
          { error: `Failed to create storage bucket: ${createError.message}` },
          { status: 500 }
        );
      }
    }

    // Upload the MP3 file
    console.log(`[founder-note] Uploading to ${BUCKET_NAME}/${STORAGE_PATH}...`);
    const { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(STORAGE_PATH, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[founder-note] Upload failed:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload audio: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // ── Get public URL ──
    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET_NAME).getPublicUrl(STORAGE_PATH);

    // Append a cache-busting timestamp so the browser always fetches fresh audio
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    console.log(`[founder-note] Success! URL: ${urlWithBust}`);

    return NextResponse.json({
      success: true,
      url: urlWithBust,
    });
  } catch (err) {
    console.error("[founder-note] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET Handler (returns current audio URL) ───────────────────────

export async function GET() {
  try {
    const admin = createAdminClient();

    // Check if file exists in storage
    const { data, error } = await admin.storage
      .from(BUCKET_NAME)
      .list("", {
        search: "founder-note.mp3",
      });

    if (error) {
      console.error("[founder-note] Storage list error:", error);
      return NextResponse.json({ exists: false, url: null });
    }

    const file = data?.find((f) => f.name === "founder-note.mp3");
    if (!file) {
      return NextResponse.json({ exists: false, url: null });
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET_NAME).getPublicUrl(STORAGE_PATH);

    return NextResponse.json({
      exists: true,
      url: `${publicUrl}?t=${Date.now()}`,
      updatedAt: file.updated_at,
    });
  } catch (err) {
    console.error("[founder-note] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
