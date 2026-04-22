import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getGhlLocationId } from "@/lib/ghl/auth";
import { listCustomFields } from "@/lib/ghl/customFields";

/**
 * GET /api/admin/ghl/custom-fields
 *
 * Fetches real custom fields from GHL using the stored credentials.
 * Returns an array of { id, name, fieldKey, dataType } objects
 * suitable for populating dropdown selects.
 */
export async function GET() {
  // Admin auth
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const locationId = await getGhlLocationId();
    const fields = await listCustomFields(locationId);
    return NextResponse.json({ fields });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ghl/custom-fields] Fetch failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
