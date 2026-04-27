import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public endpoint — returns non-sensitive app-wide configuration
 * that client components need (e.g. booking URL for the speech end screen).
 * No authentication required.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ghl_integration")
      .select("booking_url")
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      { bookingUrl: data?.booking_url ?? "" },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ bookingUrl: "" });
  }
}
