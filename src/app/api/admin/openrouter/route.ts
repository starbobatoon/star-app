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
  apiKey: z.string().optional(),
  slots: z.object({
    primary: slotConfigSchema,
    brainstorm: brainstormSlotSchema,
    // speechwriter slot removed — DB constraint blocks it and the model is unused by
    // speech-generator (only primary slot is used). The speechwriter PROMPT lives in
    // the prompts table and is still managed below.
    speechwriter: slotConfigSchema.optional(),
  }),
  prompts: z.object({
    brainstorm: z.string().optional().default(''),
    speechwriter: z.string().optional().default(''),
  }).optional().default({ brainstorm: '', speechwriter: '' }),
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

    // Get model slots (without custom_prompt — stored separately in prompts table)
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

    // Load slot-specific prompts from the prompts table (notes = 'slot:brainstorm' etc.)
    const { data: slotPromptRows } = await admin
      .from("prompts")
      .select("notes, content")
      .in("notes", ["slot:brainstorm", "slot:speechwriter"])
      .order("created_at", { ascending: false });

    const slotPromptMap: Record<string, string> = {};
    if (slotPromptRows) {
      for (const row of slotPromptRows) {
        const key = row.notes?.replace("slot:", "") ?? "";
        if (key && !slotPromptMap[key]) slotPromptMap[key] = row.content;
      }
    }

    // Inject custom_prompt into each slot from the prompts table
    const slotsWithPrompts = (slots || []).map((s) => ({
      ...s,
      custom_prompt: slotPromptMap[s.slot] ?? null,
    }));

    return NextResponse.json({
      integration: integration || null,
      slots: slotsWithPrompts,
      slotPrompts: slotPromptMap,
      promptAvailable: true,
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

  const { apiKey, slots, prompts } = parsed.data;

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

  const admin = createAdminClient();

  // ── Upsert openrouter_integration (only when apiKey provided) ──
  if (apiKey) {
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
  // speechwriter model slot intentionally NOT saved — DB CHECK constraint blocks it
  // and the model isn't used by speech-generator anyway. The speechwriter PROMPT below
  // is what actually shapes Star's voice.

  // ── Save slot prompts to the prompts table ─────────────────────
  // Stored as rows with is_active=false and notes = 'slot:brainstorm' / 'slot:speechwriter'.
  for (const [slotKey, promptText] of [
    ["slot:brainstorm", prompts.brainstorm] as const,
    ["slot:speechwriter", prompts.speechwriter] as const,
  ]) {
    const { error: deleteErr } = await admin
      .from("prompts")
      .delete()
      .eq("notes", slotKey)
      .eq("is_active", false);

    if (deleteErr) {
      console.error(`[openrouter-config] Failed to delete ${slotKey} prompt:`, deleteErr);
    }

    if (promptText && promptText.trim()) {
      const { error: insertErr } = await admin.from("prompts").insert({
        notes: slotKey,
        content: promptText.trim(),
        is_active: false,
        version: 0,
      });

      if (insertErr) {
        console.error(`[openrouter-config] Failed to save ${slotKey} prompt:`, insertErr);
        return NextResponse.json(
          { error: `Failed to save ${slotKey.replace("slot:", "")} prompt: ${insertErr.message}` },
          { status: 500 }
        );
      }
    }
  }

  // ── Audit log entry ────────────────────────────────────────────
  await writeAuditLog({
    actorEmail: user.email,
    action: "update",
    entityType: "openrouter_integration",
    afterValue: {
      api_key_updated: !!apiKey,
      primary_slot: slots.primary.modelId,
      brainstorm_slot: brainstormConfig.modelId,
      brainstorm_uses_primary: slots.brainstorm.usePrimary ?? false,
      has_brainstorm_prompt: !!prompts.brainstorm,
      has_speechwriter_prompt: !!prompts.speechwriter,
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