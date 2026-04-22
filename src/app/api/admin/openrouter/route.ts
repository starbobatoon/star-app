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
  // If usePrimary is true, copy primary config to brainstorm
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
    console.error("[openrouter-config] Encryption failed:", err);
    return NextResponse.json(
      { error: "Failed to encrypt API key. Ensure ENCRYPTION_KEY is configured." },
      { status: 500 }
    );
  }

  // Store last 4 chars as preview for UI display
  const apiKeyPreview = apiKey.length >= 4 ? `****${apiKey.slice(-4)}` : `****${apiKey}`;

  const admin = createAdminClient();

  // ── Upsert openrouter_integration ──────────────────────────────
  // Singleton pattern: there's a unique index on (true) so we upsert
  // the single row. First check if a row exists.
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
    // Update existing row
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
    // Insert new row
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

  // ── Success ────────────────────────────────────────────────────
  return NextResponse.json({ ok: true });
}