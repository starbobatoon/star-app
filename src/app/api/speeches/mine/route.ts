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
    .select("id, first_name, last_name, status, created_at, completed_at, transcript, hook, audio_ghl_url, audio_storage_path")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[speeches/mine] query error:", error);
    return NextResponse.json({ error: "Failed to fetch speeches" }, { status: 500 });
  }

  // The `speeches` table has no `audio_url` column — it stores audio_ghl_url
  // (GHL media URL) and audio_storage_path (Supabase path). Alias back to
  // audio_url so the client shape stays unchanged.
  const speeches = (data ?? []).map((row) => {
    const { audio_ghl_url, audio_storage_path, ...rest } = row as typeof row & {
      audio_ghl_url: string | null;
      audio_storage_path: string | null;
    };
    return {
      ...rest,
      audio_url: audio_ghl_url ?? audio_storage_path ?? null,
    };
  });

  return NextResponse.json({ speeches });
}
