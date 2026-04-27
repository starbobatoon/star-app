import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";

const FISH_AUDIO_API_BASE = "https://api.fish.audio/v1";

interface FishAudioModel {
  _id: string;
  type: string;
  title: string;
  description: string;
  cover_image?: string;
  state: string;
  visibility: string;
  languages?: string[];
  created_at: string;
  updated_at: string;
}

// ── GET /api/admin/fish-audio/voices ────────────────────────────────
// Lists voices from the current Fish Audio API account.
// Requires admin auth and a configured Fish Audio API key.

export async function GET() {
  try {
    // Admin auth
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch encrypted API key from DB
    const admin = createAdminClient();
    const { data: integration, error: integError } = await admin
      .from("fish_audio_integration")
      .select("api_key_encrypted, is_configured")
      .limit(1)
      .maybeSingle();

    if (integError || !integration?.is_configured || !integration.api_key_encrypted) {
      return NextResponse.json(
        { error: "Fish Audio is not configured. Add your API key first.", voices: [] },
        { status: 400 }
      );
    }

    let apiKey: string;
    try {
      apiKey = decrypt(integration.api_key_encrypted);
    } catch {
      return NextResponse.json(
        { error: "Failed to decrypt API key.", voices: [] },
        { status: 500 }
      );
    }

    // Fetch user's own voices from Fish Audio API
    // GET /model?self=true returns models owned by the authenticated user
    const url = `${FISH_AUDIO_API_BASE}/model?self=true&page_size=100&sort_by=created_at`;

    let fishResponse: Response;
    try {
      fishResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: `Network error contacting Fish Audio: ${err instanceof Error ? err.message : String(err)}`, voices: [] },
        { status: 502 }
      );
    }

    if (!fishResponse.ok) {
      // 404 means no models exist under this account (using marketplace/shared voices) — not a real error
      if (fishResponse.status === 404) {
        return NextResponse.json({ voices: [], total: 0, info: "No custom voices found in your Fish Audio account. Enter a voice ID from the Fish Audio marketplace manually below." });
      }
      const body = await fishResponse.text().catch(() => "");
      return NextResponse.json(
        { error: `Fish Audio API error (HTTP ${fishResponse.status}): ${body.slice(0, 200)}`, voices: [] },
        { status: fishResponse.status === 401 ? 401 : 502 }
      );
    }

    const fishData = (await fishResponse.json()) as {
      total: number;
      items: FishAudioModel[];
    };

    // Filter to only TTS models that are trained and ready
    const voices = (fishData.items || [])
      .filter((m) => m.type === "tts" && m.state === "trained")
      .map((m) => ({
        id: m._id,
        title: m.title,
        description: m.description,
        coverImage: m.cover_image,
        visibility: m.visibility,
        languages: m.languages || [],
        createdAt: m.created_at,
      }));

    return NextResponse.json({
      voices,
      total: fishData.total,
    });
  } catch (err) {
    console.error("[fish-audio-voices] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error", voices: [] },
      { status: 500 }
    );
  }
}
