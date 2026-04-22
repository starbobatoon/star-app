import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit-log";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

const testSchema = z.object({
  pit: z.string().min(1, "PIT is required"),
  locationId: z.string().min(1, "locationId is required"),
});

export async function POST(request: Request) {
  // --- Admin auth ---
  let actorEmail: string | undefined;
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    actorEmail = user.email ?? undefined;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse & validate body ---
  let pit: string;
  let locationId: string;
  try {
    const body = await request.json();
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    pit = parsed.data.pit;
    locationId = parsed.data.locationId;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pit}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
  };

  const errors: string[] = [];
  let locationName: string | undefined;
  let customFieldCount: number | undefined;

  // --- Check 1: GET /locations/{locationId} ---
  try {
    const locationRes = await fetch(
      `${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}`,
      { method: "GET", headers }
    );

    if (!locationRes.ok) {
      if (locationRes.status === 401) {
        errors.push("PIT is invalid or expired (401 Unauthorized).");
      } else if (locationRes.status === 404) {
        errors.push(`Location ${locationId} not found (404).`);
      } else if (locationRes.status === 403) {
        errors.push("PIT does not have access to this location (403 Forbidden).");
      } else if (locationRes.status === 429) {
        errors.push("GHL API rate limit exceeded. Try again later.");
      } else {
        const body = await locationRes.text().catch(() => "");
        errors.push(
          `Location check failed (HTTP ${locationRes.status}): ${body.slice(0, 200)}`
        );
      }
    } else {
      const data = await locationRes.json();
      locationName = data?.name ?? data?.location?.name ?? undefined;
    }
  } catch (err) {
    errors.push(
      `Network error contacting GHL for location: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // --- Check 2: GET /locations/{locationId}/customFields (only if Check 1 passed) ---
  if (errors.length === 0) {
    try {
      const cfRes = await fetch(
        `${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}/customFields`,
        { method: "GET", headers }
      );

      if (!cfRes.ok) {
        if (cfRes.status === 401 || cfRes.status === 403) {
          errors.push(
            "PIT does not have the customFields scope (HTTP " + cfRes.status + ")."
          );
        } else if (cfRes.status === 429) {
          errors.push("GHL API rate limit exceeded on customFields. Try again later.");
        } else {
          const body = await cfRes.text().catch(() => "");
          errors.push(
            `Custom fields check failed (HTTP ${cfRes.status}): ${body.slice(0, 200)}`
          );
        }
      } else {
        const data = await cfRes.json();
        customFieldCount = Array.isArray(data?.customFields)
          ? data.customFields.length
          : 0;
      }
    } catch (err) {
      errors.push(
        `Network error contacting GHL for custom fields: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const ok = errors.length === 0;

  // --- Audit log ---
  try {
    await writeAuditLog({
      actorEmail,
      action: ok ? "GHL connection test: success" : "GHL connection test: failed",
      entityType: "ghl_integration",
      entityId: locationId,
      afterValue: { ok, locationName, customFieldCount, errors: errors.length > 0 ? errors : undefined },
    });
  } catch (auditErr) {
    // Audit failure must not block the response
    console.error("[ghl/test] Audit log write failed:", auditErr);
  }

  return NextResponse.json({
    ok,
    ...(locationName !== undefined && { locationName }),
    ...(customFieldCount !== undefined && { customFieldCount }),
    ...(errors.length > 0 && { errors }),
  });
}