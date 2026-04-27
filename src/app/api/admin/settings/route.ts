import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("ghl_integration")
    .select("booking_url")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ bookingUrl: data?.booking_url ?? "" });
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingUrl } = await request.json();
  if (typeof bookingUrl !== "string") {
    return NextResponse.json({ error: "bookingUrl must be a string" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert — create the row if none exists, otherwise update
  const { data: existing } = await admin
    .from("ghl_integration")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("ghl_integration").update({ booking_url: bookingUrl }).eq("id", existing.id);
  } else {
    await admin.from("ghl_integration").insert({ booking_url: bookingUrl });
  }

  return NextResponse.json({ success: true, bookingUrl });
}
