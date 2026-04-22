import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit-log";

// ─── Request schema ────────────────────────────────────────────────

const slotConfigSchema = z.object({
  modelId: z.string().min(1, "modelId is required"),
  temperature: z.number().min(0).max(2, "temperature must be between 0 and 2"),
  maxTokens: z.number().int().min(1, "maxTokens must be a positive integer"),
});

const brainstormSlotSchema = slotConfigSchema.extend({
  usePrimary: z.boolean().optional().default(false),
});

const putOpenRouterConfigSchema = z.object({
  apiKey: z.string().min(1, "apiKey is required"),
  slots: z.object({
    primary: slotConfigSchema,
    brainstorm: brainstormSlotSchema,
  }),
});

// ─── GET /api/admin/openrouter ─────────────────────────────────────

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

    // Get integration config
    const { data: integration, error: fetchError } = await admin
      .from("openrouter_integration")
      .select("id, api_key_preview, is_configured, last_validated_at, last_validation_status, credits_remaining_usd")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[openrouter-config] Failed to fetch integration:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch configuration." },
        { status: 500 }
      );
    }

    // Get model slots
    const { data: slots, error: slotsError } = await admin
      .from("model_slots")
      .select("slot, model_id, label, temperature, max_output_tokens");

    if (slotsError) {
      console.error("[openrouter-config] Failed to fetch slots:", slotsError);
      return NextResponse.json(
        { error: "Failed to fetch model slots." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      integration: integration || null,
      slots: slots || [],
    });
  } catch (err) {
    console.error("[openrouter-config] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/admin/openrouter ─────────────────────────────────────

export async function PUT(request: Request) {
  // ── Admin auth check ───────────────────────────────────────────
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse & validate body ──────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = putOpenRouterConfigSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  const { apiKey, slots } = parsed.data;

  // ── Resolve brainstorm slot config ──────────────────────────────
  const brainstormConfig = slots.brainstorm.usePrimary
    ? {
        modelId: slots.primary.modelId,
        temperature: slots.primary.temperature,
        maxTokens: slots.primary.maxTokens,
      }
    : {
        modelId: slots.brainstorm.modelId,
        temperature: slots.brainstorm.temperature,
        maxTokens: slots.brainstorm.maxTokens,
      };

  // ── Encrypt API key ────────────────────────────────────────────
  let apiKeyEncrypted: string;
  try {
    apiKeyEncrypted = encrypt(apiKey);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[openrouter-config] Encryption failed:", errMsg);
    return NextResponse.json(
      { error: "Failed to encrypt API key. Ensure ENCRYPTION_KEY is configured." },
      { status: 500 }
    );
  }

  const apiKeyPreview = apiKey.length >= 4 ? `****${apiKey.slice(-4)}` : `****${apiKey}`;

  const admin = createAdminClient();

  // ── Upsert openrouter_integration ──────────────────────────────
  const { data: existingRow, error: fetchError } = await admin
    .from("openrouter_integration")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("[openrouter-config] Failed to check existing row:", fetchError);
    return NextResponse.json(
      { error: "Failed to check existing configuration." },
      { status: 500 }
    );
  }

  const integrationData = {
    api_key_encrypted: apiKeyEncrypted,
    api_key_preview: apiKeyPreview,
    is_configured: true,
  };

  if (existingRow) {
    const { error: updateError } = await admin
      .from("openrouter_integration")
      .update(integrationData)
      .eq("id", existingRow.id);

    if (updateError) {
      console.error("[openrouter-config] Failed to update integration:", updateError);
      return NextResponse.json(
        { error: "Failed to save API key configuration." },
        { status: 500 }
      );
    }
  } else {
    const { error: insertError } = await admin
      .from("openrouter_integration")
      .insert(integrationData);

    if (insertError) {
      console.error("[openrouter-config] Failed to insert integration:", insertError);
      return NextResponse.json(
        { error: "Failed to save API key configuration." },
        { status: 500 }
      );
    }
  }

  // ── Upsert model slots ─────────────────────────────────────────
  const primarySlot = {
    slot: "primary",
    model_id: slots.primary.modelId,
    temperature: slots.primary.temperature,
    max_output_tokens: slots.primary.maxTokens,
  };

  const brainstormSlot = {
    slot: "brainstorm",
    model_id: brainstormConfig.modelId,
    temperature: brainstormConfig.temperature,
    max_output_tokens: brainstormConfig.maxTokens,
  };

  const { error: primarySlotError } = await admin
    .from("model_slots")
    .upsert(primarySlot, { onConflict: "slot" });

  if (primarySlotError) {
    console.error("[openrouter-config] Failed to upsert primary slot:", primarySlotError);
    return NextResponse.json(
      { error: "Failed to save primary model slot." },
      { status: 500 }
    );
  }

  const { error: brainstormSlotError } = await admin
    .from("model_slots")
    .upsert(brainstormSlot, { onConflict: "slot" });

  if (brainstormSlotError) {
    console.error("[openrouter-config] Failed to upsert brainstorm slot:", brainstormSlotError);
    return NextResponse.json(
      { error: "Failed to save brainstorm model slot." },
      { status: 500 }
    );
  }

  // ── Audit log entry ────────────────────────────────────────────
  await writeAuditLog({
    actorEmail: user.email,
    action: "update",
    entityType: "openrouter_integration",
    afterValue: {
      api_key_preview: apiKeyPreview,
      is_configured: true,
      primary_slot: slots.primary.modelId,
      brainstorm_slot: brainstormConfig.modelId,
      brainstorm_uses_primary: slots.brainstorm.usePrimary ?? false,
    },
  });

  return NextResponse.json({ ok: true });
}

// ─── DELETE /api/admin/openrouter ──────────────────────────────────
// Removes the stored API key from the database

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

    // Find the existing row
    const { data: existingRow, error: fetchError } = await admin
      .from("openrouter_integration")
      .select("id, api_key_preview")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[openrouter-config] Failed to find existing row:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing configuration." },
        { status: 500 }
      );
    }

    if (!existingRow) {
      return NextResponse.json({ ok: true, message: "No key to delete" });
    }

    // Clear the API key fields but keep the row (singleton pattern)
    const { error: updateError } = await admin
      .from("openrouter_integration")
      .update({
        api_key_encrypted: null,
        api_key_preview: null,
        is_configured: false,
        last_validated_at: null,
        last_validation_status: null,
        last_validation_message: null,
        credits_remaining_usd: null,
      })
      .eq("id", existingRow.id);

    if (updateError) {
      console.error("[openrouter-config] Failed to delete API key:", updateError);
      return NextResponse.json(
        { error: "Failed to delete API key." },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actorEmail: user.email,
      action: "delete",
      entityType: "openrouter_integration",
      beforeValue: { api_key_preview: existingRow.api_key_preview },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[openrouter-config] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}