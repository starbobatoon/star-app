import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit-log";
import { testFishAudioConnection } from "@/lib/fish-audio";

// ─── Types ─────────────────────────────────────────────────────────

interface FishAudioRow {
  id: string;
  api_key_encrypted: string | null;
  api_key_preview: string | null;
  is_configured: boolean;
  last_validated_at: string | null;
  last_validation_status: string | null;
  last_validation_message: string | null;
  created_at: string;
  updated_at: string;
}

// ─── GET /api/admin/fish-audio ─────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("fish_audio_integration")
      .select("id, api_key_preview, is_configured, default_voice_id, tts_model, volume, speed, loudness_normalization, text_normalization, last_validated_at, last_validation_status, last_validation_message, created_at, updated_at")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[fish-audio-config] Failed to fetch:", error);
      // If table doesn't exist, return empty config
      if (error.message?.includes("does not exist") || error.code === "PGRST204") {
        return NextResponse.json({ integration: null });
      }
      return NextResponse.json(
        { error: "Failed to fetch configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json({ integration: data });
  } catch (err) {
    console.error("[fish-audio-config] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/admin/fish-audio ─────────────────────────────────────

const putSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

export async function PUT(request: Request) {
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

    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { apiKey } = parsed.data;

    // Encrypt the API key
    let apiKeyEncrypted: string;
    try {
      apiKeyEncrypted = encrypt(apiKey);
    } catch (err) {
      console.error("[fish-audio-config] Encryption failed:", err);
      return NextResponse.json(
        { error: "Failed to encrypt API key. Ensure ENCRYPTION_KEY is configured." },
        { status: 500 }
      );
    }

    const apiKeyPreview = apiKey.length >= 4 ? `****${apiKey.slice(-4)}` : `****${apiKey}`;

    const admin = createAdminClient();

    // Check if table exists by trying to select
    const { error: checkError } = await admin
      .from("fish_audio_integration")
      .select("id")
      .limit(1);

    if (checkError && (checkError.message?.includes("does not exist") || checkError.code === "42P01")) {
      return NextResponse.json(
        { error: "Database table not initialized. Please run migrations." },
        { status: 500 }
      );
    }

    // Test the connection first
    let validationStatus = "unknown";
    let validationMessage = "";
    let validationCategory: string | undefined;
    try {
      const result = await testFishAudioConnection(apiKey);
      validationStatus = result.ok ? "valid" : "invalid";
      validationMessage = result.ok ? "Connection successful" : (result.error || "Connection failed");
      validationCategory = result.category;
    } catch (e) {
      validationStatus = "error";
      validationMessage = e instanceof Error ? e.message : String(e);
    }

    const { data: existingRow, error: fetchError } = await admin
      .from("fish_audio_integration")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[fish-audio-config] Failed to check existing:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing configuration." },
        { status: 500 }
      );
    }

    const integrationData = {
      api_key_encrypted: apiKeyEncrypted,
      api_key_preview: apiKeyPreview,
      is_configured: validationStatus === "valid",
      last_validated_at: new Date().toISOString(),
      last_validation_status: validationStatus,
      last_validation_message: validationMessage,
    };

    if (existingRow) {
      const { error: updateError } = await admin
        .from("fish_audio_integration")
        .update(integrationData)
        .eq("id", existingRow.id);

      if (updateError) {
        console.error("[fish-audio-config] Failed to update:", updateError);
        return NextResponse.json(
          { error: "Failed to save configuration." },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await admin
        .from("fish_audio_integration")
        .insert(integrationData);

      if (insertError) {
        console.error("[fish-audio-config] Failed to insert:", insertError);
        return NextResponse.json(
          { error: "Failed to save configuration." },
          { status: 500 }
        );
      }
    }

    await writeAuditLog({
      actorEmail: user.email,
      action: "update",
      entityType: "fish_audio_integration",
      afterValue: {
        api_key_preview: apiKeyPreview,
        is_configured: validationStatus === "valid",
        validation_status: validationStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      validationStatus,
      validationMessage,
      ...(validationCategory && { validationCategory }),
    });
  } catch (err) {
    console.error("[fish-audio-config] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/fish-audio ─────────────────────────────────────
// Saves Fish Audio config (api_key + voice_id)

const postSchema = z.object({
  apiKey: z.string().min(1).optional(),
  voiceId: z.string().min(1, "Voice ID is required").optional(),
  ttsModel: z.string().optional().default("s2-pro"),
  volume: z.number().min(-5).max(5).optional().default(0),
  speed: z.number().min(0.7).max(1.3).optional().default(1.0),
  loudnessNormalization: z.boolean().optional().default(true),
  textNormalization: z.boolean().optional().default(false),
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { apiKey, voiceId, ttsModel, volume, speed, loudnessNormalization, textNormalization } = parsed.data;
    const admin = createAdminClient();

    const { data: existingRow, error: fetchError } = await admin
      .from("fish_audio_integration")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[fish-audio-config] Failed to check existing:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing configuration." },
        { status: 500 }
      );
    }
    const integrationData: Record<string, unknown> = {
      tts_model: ttsModel,
      volume,
      speed,
      loudness_normalization: loudnessNormalization,
      text_normalization: textNormalization,
    };

    // Only update voiceId if provided
    if (voiceId) {
      integrationData.default_voice_id = voiceId;
    }

    // Only process API key if provided
    let apiKeyPreview: string | undefined;
    let validationStatus = "unknown";
    let validationMessage = "";
    if (apiKey) {
      let apiKeyEncrypted: string;
      try {
        apiKeyEncrypted = encrypt(apiKey);
      } catch (err) {
        console.error("[fish-audio-config] Encryption failed:", err);
        return NextResponse.json(
          { error: "Failed to encrypt API key. Ensure ENCRYPTION_KEY is configured." },
          { status: 500 }
        );
      }
      apiKeyPreview = apiKey.length >= 4 ? `****${apiKey.slice(-4)}` : `****${apiKey}`;

      try {
        const result = await testFishAudioConnection(apiKey);
        validationStatus = result.ok ? "valid" : "invalid";
        validationMessage = result.ok ? "Connection successful" : (result.error || "Connection failed");
      } catch (e) {
        validationStatus = "error";
        validationMessage = e instanceof Error ? e.message : String(e);
      }
      integrationData.api_key_encrypted = apiKeyEncrypted;
      integrationData.api_key_preview = apiKeyPreview;
      integrationData.is_configured = validationStatus === "valid";
      integrationData.last_validated_at = new Date().toISOString();
      integrationData.last_validation_status = validationStatus;
      integrationData.last_validation_message = validationMessage;
    }

    if (existingRow) {
      const { error: updateError } = await admin
        .from("fish_audio_integration")
        .update(integrationData)
        .eq("id", existingRow.id);

      if (updateError) {
        console.error("[fish-audio-config] Failed to update:", updateError);
        return NextResponse.json(
          { error: "Failed to save configuration." },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await admin
        .from("fish_audio_integration")
        .insert(integrationData);

      if (insertError) {
        console.error("[fish-audio-config] Failed to insert:", insertError);
        return NextResponse.json(
          { error: "Failed to save configuration." },
          { status: 500 }
        );
      }
    }
    await writeAuditLog({
      actorEmail: user.email,
      action: "update",
      entityType: "fish_audio_integration",
      afterValue: {
        api_key_preview: apiKeyPreview,
        is_configured: validationStatus === "valid",
        default_voice_id: voiceId,
        tts_model: ttsModel,
        validation_status: validationStatus,
      },
    });
    return NextResponse.json({
      ok: true,
      validationStatus,
      validationMessage,
      voiceId,
    });
  } catch (err) {
    console.error("[fish-audio-config] POST error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/admin/fish-audio ──────────────────────────────────

export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: existingRow, error: fetchError } = await admin
      .from("fish_audio_integration")
      .select("id, api_key_preview")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      if (fetchError.message?.includes("does not exist")) {
        return NextResponse.json({ ok: true });
      }
      console.error("[fish-audio-config] Failed to find:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing configuration." },
        { status: 500 }
      );
    }

    if (!existingRow) {
      return NextResponse.json({ ok: true, message: "No key to delete" });
    }

    const { error: updateError } = await admin
      .from("fish_audio_integration")
      .update({
        api_key_encrypted: null,
        api_key_preview: null,
        is_configured: false,
        default_voice_id: null,
        last_validated_at: null,
        last_validation_status: null,
        last_validation_message: null,
      })
      .eq("id", existingRow.id);

    if (updateError) {
      console.error("[fish-audio-config] Failed to delete:", updateError);
      return NextResponse.json(
        { error: "Failed to delete API key." },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actorEmail: user.email,
      action: "delete",
      entityType: "fish_audio_integration",
      beforeValue: { api_key_preview: existingRow.api_key_preview },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fish-audio-config] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}