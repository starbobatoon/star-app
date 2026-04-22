import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

/**
 * Authenticated speech rating endpoint.
 * Only the speech owner (matching email) or an admin can rate a speech.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Fetch the speech to verify ownership
    const { data: speech, error: fetchError } = await supabase
      .from("speeches")
      .select("id, email")
      .eq("id", id)
      .single();

    if (fetchError || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    // Ownership check: speech email must match authenticated user email, or user must be admin
    const isOwner = user.email && speech.email && user.email.toLowerCase() === speech.email.toLowerCase();
    if (!isOwner && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
