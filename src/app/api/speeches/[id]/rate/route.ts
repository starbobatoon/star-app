import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public speech rating endpoint — no authentication required.
 * Allows users to rate their generated speech 1-4 stars.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rating } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 4 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 4" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: speech, error: fetchError } = await supabase
      .from("speeches")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("speeches")
      .update({ rating })
      .eq("id", id);

    if (updateError) {
      console.error("[speeches/[id]/rate] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save rating" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rating });
  } catch (err) {
    console.error("[speeches/[id]/rate] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
