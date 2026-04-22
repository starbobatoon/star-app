import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit-log";

// ─── Request schema ────────────────────────────────────────────────

const fieldMappingSchema = z.object({
  starAppField: z.string().min(1, "starAppField is required"),
  ghlCustomFieldId: z.string().min(1, "ghlCustomFieldId is required"),
});

const putGhlConfigSchema = z.object({
  pit: z.string().min(1, "PIT is required"),
  locationId: z.string().min(1, "locationId is required"),
  fieldMappings: z.array(fieldMappingSchema).min(1, "At least one field mapping is required"),
  workflowId: z.string().min(1, "workflowId is required"),
  triggerEvent: z.string().min(1, "triggerEvent is required"),
  n8nWebhookUrl: z.string().url("n8nWebhookUrl must be a valid URL").or(z.literal("")),
  n8nEnabled: z.boolean(),
});

// ─── PUT /api/admin/ghl ────────────────────────────────────────────

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

  const parsed = putGhlConfigSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  const { pit, locationId, fieldMappings, workflowId, triggerEvent, n8nWebhookUrl, n8nEnabled } = parsed.data;

  // ── Encrypt PIT ────────────────────────────────────────────────
  let pitEncrypted: string;
  try {
    pitEncrypted = encrypt(pit);
  } catch (err) {
    console.error("[ghl-config] Encryption failed:", err);
    return NextResponse.json(
      { error: "Failed to encrypt PIT. Ensure ENCRYPTION_KEY is configured." },
      { status: 500 }
    );
  }

  const pitPreview = pit.length >= 4 ? pit.slice(-4) : pit;

  // ── Upsert ghl_integration ─────────────────────────────────────
  const admin = createAdminClient();

  // Check if a row already exists for this location
  const { data: existing, error: fetchError } = await admin
    .from("ghl_integration")
    .select("id")
    .eq("location_id", locationId)
    .maybeSingle();

  if (fetchError) {
    console.error("[ghl-config] Failed to query ghl_integration:", fetchError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const integrationPayload = {
    pit_encrypted: pitEncrypted,
    pit_preview: pitPreview,
    location_id: locationId,
    is_configured: true,
    workflow_id: workflowId,
    trigger_event: triggerEvent,
    n8n_webhook_url: n8nWebhookUrl || null,
    n8n_enabled: n8nEnabled,
  };

  let integrationId: string;

  if (existing) {
    // Update existing row
    const { data: updated, error: updateError } = await admin
      .from("ghl_integration")
      .update(integrationPayload)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError || !updated) {
      console.error("[ghl-config] Failed to update ghl_integration:", updateError);
      return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
    }
    integrationId = updated.id;
  } else {
    // Insert new row
    const { data: inserted, error: insertError } = await admin
      .from("ghl_integration")
      .insert(integrationPayload)
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[ghl-config] Failed to insert ghl_integration:", insertError);
      return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
    }
    integrationId = inserted.id;
  }

  // ── Replace field mappings (delete old, insert new) ────────────
  const { error: deleteError } = await admin
    .from("ghl_field_mappings")
    .delete()
    .eq("location_id", locationId);

  if (deleteError) {
    console.error("[ghl-config] Failed to delete old field mappings:", deleteError);
    // Non-fatal: log and continue. Old mappings may not exist yet.
  }

  if (fieldMappings.length > 0) {
    const mappingRows = fieldMappings.map((fm) => ({
      location_id: locationId,
      star_app_field: fm.starAppField,
      ghl_custom_field_id: fm.ghlCustomFieldId,
    }));

    const { error: insertMappingsError } = await admin
      .from("ghl_field_mappings")
      .insert(mappingRows);

    if (insertMappingsError) {
      console.error("[ghl-config] Failed to insert field mappings:", insertMappingsError);
      return NextResponse.json(
        { error: "Failed to save field mappings" },
        { status: 500 }
      );
    }
  }

  // ── Audit log ──────────────────────────────────────────────────
  await writeAuditLog({
    actorEmail: user.email,
    action: existing ? "update" : "create",
    entityType: "ghl_integration",
    entityId: integrationId,
    afterValue: {
      location_id: locationId,
      pit_preview: pitPreview,
      is_configured: true,
      workflow_id: workflowId,
      trigger_event: triggerEvent,
      n8n_enabled: n8nEnabled,
      field_mappings_count: fieldMappings.length,
    },
  });

  return NextResponse.json({ ok: true });
}