import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { runSpeechPipeline } from "@/lib/pipeline";

// Allow up to 5 minutes for admin-triggered regeneration.
export const maxDuration = 300;

// ── POST /api/speeches/[id]/generate ─────────────────────────────────────
// Triggers the full pipeline (text → audio → GHL) for a speech.
// Requires admin auth.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speechId } = await params;

    // ── Admin auth ────────────────────────────────────────────────────
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Verify speech exists and is in a valid state ──────────────────
    const admin = createAdminClient();

    const { data: speech, error: fetchError } = await admin
      .from("speeches")
      .select("id, status")
      .eq("id", speechId)
      .single();

    if (fetchError || !speech) {
      console.error(
        `[speeches.generate] Speech not found: ${speechId}`,
        fetchError
      );
      return NextResponse.json(
        { error: "Speech not found" },
        { status: 404 }
      );
    }

    // Block re-generation if already in progress
    const inProgressStatuses = [
      "upserting_contact",
      "generating_text",
      "generating_audio",
      "uploading",
      "syncing_ghl",
    ];

    if (inProgressStatuses.includes(speech.status)) {
      return NextResponse.json(
        {
          error: "Speech generation is already in progress",
          speech: { id: speechId, status: speech.status },
        },
        { status: 409 }
      );
    }

    // ── Reset status to pending before starting pipeline ──────────────
    const { error: resetError } = await admin
      .from("speeches")
      .update({ status: "pending", error: null, updated_at: new Date().toISOString() })
      .eq("id", speechId);

    if (resetError) {
      console.error(
        "[speeches.generate] Failed to reset speech status:",
        resetError
      );
      return NextResponse.json(
        { error: "Failed to reset speech status" },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actorEmail: user.email,
      action: "pipeline_triggered",
      entityType: "speeches",
      entityId: speechId,
      afterValue: { status: "pending", triggeredBy: user.email },
    });

    // ── Run the pipeline ──────────────────────────────────────────────
    const result = await runSpeechPipeline(speechId);

    if (!result.success) {
      // Fetch current status (stage handlers set status to 'failed')
      const { data: updatedSpeech } = await admin
        .from("speeches")
        .select("id, status")
        .eq("id", speechId)
        .single();

      return NextResponse.json(
        {
          success: false,
          speech: { id: speechId, status: updatedSpeech?.status ?? "failed" },
          error: result.error,
        },
        { status: 500 }
      );
    }

    // ── Success ────────────────────────────────────────────────────────
    const { data: completedSpeech } = await admin
      .from("speeches")
      .select("id, status")
      .eq("id", speechId)
      .single();

    return NextResponse.json({
      success: true,
      speech: {
        id: speechId,
        status: completedSpeech?.status ?? "complete",
      },
    });
  } catch (err) {
    console.error("[speeches.generate] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}