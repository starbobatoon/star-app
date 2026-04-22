import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { testFishAudioConnection } from "@/lib/fish-audio";

// ─── POST /api/admin/fish-audio/test ────────────────────────────────
// Tests the Fish Audio connection with the provided API key

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = z.object({
      apiKey: z.string().min(1),
      voiceId: z.string().optional(),
    }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    const { apiKey, voiceId } = parsed.data;

    // If no voiceId provided, try to get default from DB
    let resolvedVoiceId = voiceId;
    if (!resolvedVoiceId) {
      try {
        const admin = createAdminClient();
        const { data: integration } = await admin
          .from("fish_audio_integration")
          .select("default_voice_id")
          .limit(1)
          .maybeSingle();
        if (integration?.default_voice_id) {
          resolvedVoiceId = integration.default_voice_id;
        }
      } catch {
        // ignore, let the library handle no voice ID
      }
    }

    let result: Awaited<ReturnType<typeof testFishAudioConnection>>;

    try {
      result = await testFishAudioConnection(apiKey, resolvedVoiceId);
    } catch (e) {
      result = {
        ok: false,
        category: "api" as const,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }

    return NextResponse.json({
      ok: result.ok,
      message: result.ok ? "Connection successful" : result.error,
      ...(result.category && { category: result.category }),
    });
  } catch (err) {
    console.error("[fish-audio-config] POST /test error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
