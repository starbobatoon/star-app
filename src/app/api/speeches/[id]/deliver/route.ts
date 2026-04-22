import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";
import { sendDeliveryNotifications } from "@/lib/notify";

/**
 * POST /api/speeches/[id]/deliver
 *
 * Triggers delivery notifications (GHL upsert + workflow / n8n fallback)
 * for a completed speech.  Admin-only.
 *
 * Guards:
 *  - Auth required (admin role)
 *  - Speech must exist and be in a completed status
 *  - Duplicate retrigger blocked if delivery was already successful
 *    within the last hour
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speechId } = await params;

    // ── Admin auth guard ──────────────────────────────────────────────
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Forbidden — admin only" },
        { status: 403 }
      );
    }

    // ── Verify speech exists and is complete ──────────────────────────
    const admin = createAdminClient();

    const { data: speech, error } = await admin
      .from("speeches")
      .select("id, status, delivery_status, updated_at")
      .eq("id", speechId)
      .single();

    if (error || !speech) {
      return NextResponse.json(
        { error: "Speech not found" },
        { status: 404 }
      );
    }

    if (speech.status !== "complete" && speech.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Speech is not complete — delivery can only be triggered for completed speeches",
          status: speech.status,
        },
        { status: 409 }
      );
    }

    // ── Duplicate retrigger guard ─────────────────────────────────────
    const existing = speech.delivery_status as Record<string, any> | null;
    if (existing) {
      const emailAttempted = existing.email?.attempted;
      const emailSuccess = existing.email?.success;
      const smsAttempted = existing.sms?.attempted;
      const smsSuccess = existing.sms?.success;
      const anyAttempted = emailAttempted || smsAttempted;

      if (anyAttempted && (emailSuccess || smsSuccess)) {
        const updatedAt = new Date(speech.updated_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (updatedAt > oneHourAgo) {
          return NextResponse.json(
            {
              error:
                "Delivery was already triggered recently. Wait at least 1 hour before retriggering.",
              delivery: existing,
            },
            { status: 429 }
          );
        }
      }
    }

    // ── Trigger delivery ──────────────────────────────────────────────
    const result = await sendDeliveryNotifications(speechId);

    return NextResponse.json({
      success: result.status !== "skipped",
      delivery: result,
    });
  } catch (err) {
    console.error("[speeches/[id]/deliver] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
