import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/speeches/mine?email=... — returns speeches for a given email address
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("speeches")
    .select("id, first_name, last_name, status, created_at, completed_at, transcript, hook, audio_url")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[speeches/mine] query error:", error);
    return NextResponse.json({ error: "Failed to fetch speeches" }, { status: 500 });
  }

  return NextResponse.json({ speeches: data ?? [] });
}
