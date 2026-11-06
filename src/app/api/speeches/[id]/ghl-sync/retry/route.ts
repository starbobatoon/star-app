import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";
import { writeAuditLog } from "@/lib/audit-log";
import { syncSpeechToGHL } from "@/lib/ghl-sync";

// Allow time for GHL API calls.
export const maxDuration = 120;

// ── POST /api/speeches/[id]/ghl-sync/retry ─────────────────────────
// Re-runs the GoHighLevel sync for a speech whose sync previously
// failed (e.g. a momentary GHL outage). Admin only. The sync is an
// upsert keyed by email, so retrying is safe and idempotent.
// The speech's own status is never changed by a failed retry —
// the outcome is recorded in its ghl_sync_* fields.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speechId } = await params;

    // ── Admin auth ────────────────────────────────────────────────
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // ── Verify the speech exists ──────────────────────────────────
    const admin = createAdminClient();
    const { data: speech, error: fetchError } = await admin
      .from("speeches")
      .select("id, status")
      .eq("id", speechId)
      .single();

    if (fetchError || !speech) {
      return NextResponse.json(
        { error: "Speech not found" },
        { status: 404 }
      );
    }

    // Don't fight an in-progress pipeline run.
    if (speech.status === "syncing_ghl") {
      return NextResponse.json(
        { error: "GHL sync is already in progress for this speech" },
        { status: 409 }
      );
    }

    await writeAuditLog({
      actorEmail: user.email,
      action: "sync_ghl_retry_triggered",
      entityType: "speeches",
      entityId: speechId,
    });

    const result = await syncSpeechToGHL(speechId);

    // Restore the speech's own status — syncSpeechToGHL ends by
    // marking the speech complete, which is wrong for a speech that
    // is still mid-generation; put back whatever it was.
    if (speech.status !== "complete") {
      await admin
        .from("speeches")
        .update({ status: speech.status })
        .eq("id", speechId);
    }

    return NextResponse.json(
      {
        success: result.success,
        skipped: result.skipped ?? false,
        retryable: result.retryable ?? undefined,
        contactId: result.contactId,
        error: result.error,
      },
      { status: result.success ? 200 : 502 }
    );
  } catch (err) {
    console.error("[speeches.ghl-sync.retry] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
