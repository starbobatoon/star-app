import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { testFishAudioConnection } from "@/lib/fish-audio";

// ─── POST /api/admin/fish-audio/test ─────────────────────────────
// Tests the Fish Audio connection using the stored encrypted key
// or a key provided in the request body.

const testBodySchema = z.object({
  apiKey: z.string().min(1, "API key is required").optional(),
  voiceId: z.string().optional(),
});

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

    // Try to get API key from request body first
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = testBodySchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    let apiKey: string | undefined = parsed.data.apiKey;

    // If no key provided in body, try to get the stored encrypted key
    if (!apiKey) {
      const admin = createAdminClient();
      const { data: integration, error: fetchError } = await admin
        .from("fish_audio_integration")
        .select("api_key_encrypted")
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("[fish-audio-test] Failed to fetch stored key:", fetchError);
        return NextResponse.json(
          { error: "Failed to retrieve stored API key." },
          { status: 500 }
        );
      }

      if (!integration?.api_key_encrypted) {
        return NextResponse.json(
          { error: "No API key configured. Please save a key first." },
          { status: 400 }
        );
      }

      try {
        apiKey = decrypt(integration.api_key_encrypted);
      } catch (err) {
        console.error("[fish-audio-test] Decryption failed:", err);
        return NextResponse.json(
          { error: "Failed to decrypt stored API key." },
          { status: 500 }
        );
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key available for testing." },
        { status: 400 }
      );
    }

    // Test the connection
    const isValid = await testFishAudioConnection(apiKey);

    if (isValid) {
      // Update last validation status
      const admin = createAdminClient();
      await admin
        .from("fish_audio_integration")
        .update({
          last_validated_at: new Date().toISOString(),
          last_validation_status: "valid",
          last_validation_message: "Test successful",
        })
        .not("id", "is", null)
        .limit(1);

      return NextResponse.json({
        ok: true,
        status: "connected",
        message: "Fish Audio connection successful!",
      });
    } else {
      return NextResponse.json({
        ok: false,
        status: "failed",
        message: "Fish Audio connection failed. Please check your API key.",
      });
    }
  } catch (err) {
    console.error("[fish-audio-test] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}