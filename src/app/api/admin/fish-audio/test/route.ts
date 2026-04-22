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

    const parsed = z.object({ apiKey: z.string().min(1) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    const { apiKey } = parsed.data;

    let isValid = false;
    let message = "";

    try {
      isValid = await testFishAudioConnection(apiKey);
      message = isValid ? "Connection successful" : "Connection failed - invalid key";
    } catch (e) {
      message = e instanceof Error ? e.message : "Unknown error";
    }

    return NextResponse.json({ ok: isValid, message });
  } catch (err) {
    console.error("[fish-audio-config] POST /test error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}