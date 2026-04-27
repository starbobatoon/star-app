import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit-log";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

export async function POST(request: Request) {
  let actorEmail: string | undefined;
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    actorEmail = user.email ?? undefined;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept optional pit / locationId from body; fall back to saved DB values
  let pit: string | undefined;
  let locationId: string | undefined;
  try {
    const body = await request.json();
    if (body?.pit && typeof body.pit === "string" && body.pit.trim()) pit = body.pit.trim();
    if (body?.locationId && typeof body.locationId === "string" && body.locationId.trim()) locationId = body.locationId.trim();
  } catch { /* empty body fine */ }

  if (!pit || !locationId) {
    const admin = createAdminClient();
    const { data: integration } = await admin
      .from("ghl_integration")
      .select("pit_encrypted, location_id, is_configured")
      .limit(1)
      .maybeSingle();

    if (!integration?.is_configured || !integration.pit_encrypted) {
      return NextResponse.json(
        { ok: false, errors: ["No GHL credentials saved. Enter your PIT and Location ID and save first."] },
        { status: 400 }
      );
    }

    try {
      if (!pit) pit = decrypt(integration.pit_encrypted);
    } catch {
      return NextResponse.json(
        { ok: false, errors: ["Failed to decrypt saved GHL credentials. Ensure ENCRYPTION_KEY is set in Vercel."] },
        { status: 500 }
      );
    }

    if (!locationId) locationId = integration.location_id ?? undefined;
  }

  if (!pit || !locationId) {
    return NextResponse.json({ ok: false, errors: ["PIT and Location ID are required."] }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pit}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
  };

  const errors: string[] = [];
  let locationName: string | undefined;
  let customFieldCount: number | undefined;

  // Check 1: verify location
  try {
    const locationRes = await fetch(`${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}`, { method: "GET", headers });
    if (!locationRes.ok) {
      if (locationRes.status === 401) errors.push("PIT is invalid or expired (401 Unauthorized).");
      else if (locationRes.status === 404) errors.push(`Location ${locationId} not found (404).`);
      else if (locationRes.status === 403) errors.push("PIT does not have access to this location (403 Forbidden).");
      else if (locationRes.status === 429) errors.push("GHL API rate limit exceeded. Try again later.");
      else errors.push(`Location check failed (HTTP ${locationRes.status})`);
    } else {
      const data = await locationRes.json();
      locationName = data?.name ?? data?.location?.name ?? undefined;
    }
  } catch (err) {
    errors.push(`Network error contacting GHL: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Check 2: custom fields
  if (errors.length === 0) {
    try {
      const cfRes = await fetch(`${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}/customFields`, { method: "GET", headers });
      if (!cfRes.ok) {
        if (cfRes.status === 401 || cfRes.status === 403) errors.push(`PIT does not have the customFields scope (HTTP ${cfRes.status}).`);
        else if (cfRes.status === 429) errors.push("GHL API rate limit exceeded on customFields.");
        else errors.push(`Custom fields check failed (HTTP ${cfRes.status})`);
      } else {
        const data = await cfRes.json();
        customFieldCount = Array.isArray(data?.customFields) ? data.customFields.length : 0;
      }
    } catch (err) {
      errors.push(`Network error on custom fields: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const ok = errors.length === 0;
  try {
    await writeAuditLog({ actorEmail, action: ok ? "GHL connection test: success" : "GHL connection test: failed", entityType: "ghl_integration", entityId: locationId, afterValue: { ok, locationName, customFieldCount, errors: errors.length > 0 ? errors : undefined } });
  } catch { /* audit failure must not block response */ }

  return NextResponse.json({
    ok,
    ...(locationName !== undefined && { locationName }),
    ...(customFieldCount !== undefined && { customFieldCount }),
    ...(errors.length > 0 && { errors }),
  });
}
