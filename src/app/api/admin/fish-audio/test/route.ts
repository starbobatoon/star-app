import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { testFishAudioConnection } from "@/lib/fish-audio";

// ─── POST /api/admin/fish-audio/test ────────────────────────────────
// Tests the Fish Audio connection. If apiKey is omitted, uses the saved DB key.

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accept optional apiKey / voiceId from the body
    let providedKey: string | undefined;
    let providedVoiceId: string | undefined;
    try {
      const body = await request.json();
      if (body?.apiKey && typeof body.apiKey === "string" && body.apiKey.trim()) {
        providedKey = body.apiKey.trim();
      }
      if (body?.voiceId && typeof body.voiceId === "string") {
        providedVoiceId = body.voiceId.trim();
      }
    } catch { /* empty body fine */ }

    const admin = createAdminClient();

    // Resolve API key — use provided or fall back to saved DB key
    let apiKey = providedKey;
    if (!apiKey) {
      const { data: integration } = await admin
        .from("fish_audio_integration")
        .select("api_key_encrypted, is_configured, default_voice_id")
        .limit(1)
        .maybeSingle();

      if (!integration?.is_configured || !integration.api_key_encrypted) {
        return NextResponse.json(
          { ok: false, message: "No API key saved. Enter your Fish Audio key and save it first.", category: "missing" },
          { status: 400 }
        );
      }

      try {
        apiKey = decrypt(integration.api_key_encrypted);
      } catch {
        return NextResponse.json(
          { ok: false, message: "Failed to decrypt saved API key. Ensure ENCRYPTION_KEY is set in Vercel.", category: "config" },
          { status: 500 }
        );
      }

      // Also resolve voice ID from DB if not provided
      if (!providedVoiceId && integration.default_voice_id) {
        providedVoiceId = integration.default_voice_id;
      }
    }

    // If still no voice ID, try the active voice row
    if (!providedVoiceId) {
      const { data: activeVoice } = await admin
        .from("voices")
        .select("fish_audio_voice_id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (activeVoice?.fish_audio_voice_id) {
        providedVoiceId = activeVoice.fish_audio_voice_id;
      }
    }

    let result: Awaited<ReturnType<typeof testFishAudioConnection>>;
    try {
      result = await testFishAudioConnection(apiKey, providedVoiceId);
    } catch (e) {
      result = { ok: false, category: "api" as const, error: e instanceof Error ? e.message : "Unknown error" };
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
