import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit-log";

// ─── GET /api/admin/ghl ─────────────────────────────────────────────

export async function GET() {
  // Admin auth check
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Load integration config
  const { data: integration, error: intError } = await admin
    .from("ghl_integration")
    .select("id, location_id, pit_preview, is_configured, workflow_id, ghl_workflow_id, sms_workflow_id, trigger_event, n8n_webhook_url, n8n_enabled")
    .limit(1)
    .maybeSingle();

  if (intError) {
    console.error("[ghl-config] Failed to load integration:", intError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!integration) {
    return NextResponse.json({ configured: false });
  }

  // Load field mappings
  const { data: mappings, error: mapError } = await admin
    .from("ghl_field_mappings")
    .select("star_app_field, ghl_custom_field_id")
    .eq("location_id", integration.location_id);

  if (mapError) {
    console.error("[ghl-config] Failed to load field mappings:", mapError);
    // Non-fatal: return integration without mappings
  }

  return NextResponse.json({
    configured: integration.is_configured,
    locationId: integration.location_id,
    pitPreview: integration.pit_preview,
    workflowId: integration.workflow_id ?? "",
    ghlWorkflowId: integration.ghl_workflow_id ?? integration.workflow_id ?? "",
    smsWorkflowId: integration.sms_workflow_id ?? "",
    triggerEvent: integration.trigger_event ?? "star_speech_ready",
    n8nWebhookUrl: integration.n8n_webhook_url ?? "",
    n8nEnabled: integration.n8n_enabled ?? false,
    fieldMappings: (mappings ?? []).map((m) => ({
      starAppField: m.star_app_field,
      ghlCustomFieldId: m.ghl_custom_field_id,
    })),
  });
}

// ─── Request schema ────────────────────────────────────────────────

const fieldMappingSchema = z.object({
  starAppField: z.string().min(1, "starAppField is required"),
  ghlCustomFieldId: z.string().min(1, "ghlCustomFieldId is required"),
});

const putGhlConfigSchema = z.object({
  pit: z.string().min(1, "PIT is required"), // raw token or "unchanged:<locationId>"
  locationId: z.string().min(1, "locationId is required"),
  fieldMappings: z.array(fieldMappingSchema).optional().default([]),
  workflowId: z.string().optional().default(""),
  ghlWorkflowId: z.string().optional().default(""),
  smsWorkflowId: z.string().optional().default(""),
  triggerEvent: z.string().optional().default("star_speech_ready"),
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

  const { pit, locationId, fieldMappings, workflowId, ghlWorkflowId, smsWorkflowId, triggerEvent, n8nWebhookUrl, n8nEnabled } = parsed.data;

  // ── Encrypt PIT (skip if unchanged) ───────────────────────────
  const admin = createAdminClient();
  let pitEncrypted: string;
  let pitPreview: string;

  if (pit.startsWith("unchanged:")) {
    const { data: existingPit, error: pitFetchError } = await admin
      .from("ghl_integration")
      .select("pit_encrypted, pit_preview")
      .eq("location_id", locationId)
      .maybeSingle();

    if (pitFetchError || !existingPit?.pit_encrypted) {
      return NextResponse.json(
        { error: "Failed to retrieve existing PIT. Please re-enter your token." },
        { status: 500 }
      );
    }
    pitEncrypted = existingPit.pit_encrypted;
    pitPreview = existingPit.pit_preview ?? "";
  } else {
    try {
      pitEncrypted = encrypt(pit);
    } catch (err) {
      console.error("[ghl-config] Encryption failed:", err);
      return NextResponse.json(
        { error: "Failed to encrypt PIT. Ensure ENCRYPTION_KEY is configured." },
        { status: 500 }
      );
    }
    pitPreview = pit.length >= 4 ? pit.slice(-4) : pit;
  }

  // ── Upsert ghl_integration ─────────────────────────────────────
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
    ghl_workflow_id: ghlWorkflowId,
    sms_workflow_id: smsWorkflowId,
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