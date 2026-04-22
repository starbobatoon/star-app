import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check: must be authenticated and admin
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { id: speechId } = await params;
    const body = await request.json().catch(() => ({}));
    const section = body.section as "hook" | "story" | "point" | "cta" | "exit" | null | undefined;

    const supabase = createAdminClient();

    // Fetch speech to verify it exists
    const { data: speech, error: fetchError } = await supabase
      .from("speeches")
      .select("id, status")
      .eq("id", speechId)
      .single();

    if (fetchError || !speech) {
      console.error(`[speeches.regenerate] Speech not found: ${speechId}`, fetchError);
      return NextResponse.json(
        { error: "Speech not found" },
        { status: 404 }
      );
    }

    const isFullRegeneration = !section || section === null;
    const newStatus = isFullRegeneration ? "pending" : speech.status;

    // Update speech status
    const { error: updateError } = await supabase
      .from("speeches")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", speechId);

    if (updateError) {
      console.error("[speeches.regenerate] Failed to update speech status:", updateError);
      return NextResponse.json(
        { error: "Failed to update speech status" },
        { status: 500 }
      );
    }

    // Write audit log
    const actionDescription = isFullRegeneration
      ? "full"
      : `section:${section}`;

    await writeAuditLog({
      action: "update",
      entityType: "speeches",
      entityId: speechId,
      beforeValue: { status: speech.status },
      afterValue: { status: newStatus },
    });

    console.log(
      `[speeches.regenerate] Regeneration queued: ${actionDescription} for speech ${speechId}`
    );

    return NextResponse.json({
      speech: {
        id: speechId,
        status: newStatus,
      },
      message: "Regeneration queued",
    });
  } catch (err) {
    console.error("[speeches.regenerate] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}