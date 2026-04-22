import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: speech, error } = await supabase
      .from("speeches")
      .select(
        "id, first_name, last_name, email, phone, status, transcript, audio_url, answers, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (error || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    return NextResponse.json({ speech });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}