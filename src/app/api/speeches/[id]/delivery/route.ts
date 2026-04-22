import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";
import { notifyOnCompletion, type DeliveryStatus } from "@/lib/notify";

/**
 * GET /api/speeches/[id]/delivery
 *
 * Returns the delivery status for a speech.
 * Requires auth. Users can only view their own speeches; admins can view any.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: speech, error } = await admin
      .from("speeches")
      .select("id, status, delivery_status, email, phone, completed_at, user_id")
      .eq("id", id)
      .single();

    if (error || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    // Ownership check: user must own the speech or be admin
    if (!isAdmin(user) && speech.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deliveryStatus = speech.delivery_status as DeliveryStatus | null;

    return NextResponse.json({
      id: speech.id,
      status: speech.status,
      completedAt: speech.completed_at,
      delivery: deliveryStatus ?? {
        email: {
          attempted: speech.status === "complete",
          success: speech.status === "complete",
          method: "unknown",
          note: "Delivery status column may not exist — check ghl_integration config for details",
        },
        sms: {
          attempted: false,
          success: false,
          note: "SMS requires n8n webhook with SMS provider integration",
        },
      },
    });
  } catch (err) {
    console.error("[speeches/[id]/delivery] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/speeches/[id]/delivery
 *
 * Re-triggers delivery notification for a completed speech.
 * Admin-only. Blocks duplicate retrigger if delivery was already
 * successfully completed within the last hour.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speechId } = await params;

    // Auth — admin only for re-trigger
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Verify speech exists and is complete
    const { data: speech, error } = await admin
      .from("speeches")
      .select("id, status, delivery_status, updated_at")
      .eq("id", speechId)
      .single();

    if (error || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    if (speech.status !== "complete" && speech.status !== "completed") {
      return NextResponse.json(
        {
          error: "Speech is not complete — delivery can only be triggered for completed speeches",
          status: speech.status,
        },
        { status: 409 }
      );
    }

    // Duplicate retrigger guard: if delivery was already attempted successfully
    // within the last hour, block to prevent abuse
    const existingDelivery = speech.delivery_status as DeliveryStatus | null;
    if (existingDelivery) {
      const emailOk = existingDelivery.email?.attempted && existingDelivery.email?.success;
      const smsOk = existingDelivery.sms?.attempted && existingDelivery.sms?.success;
      const anyAttempted = existingDelivery.email?.attempted || existingDelivery.sms?.attempted;

      if (anyAttempted && (emailOk || smsOk)) {
        const updatedAt = new Date(speech.updated_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (updatedAt > oneHourAgo) {
          return NextResponse.json(
            {
              error: "Delivery was already triggered recently. Wait at least 1 hour before retriggering.",
              delivery: existingDelivery,
            },
            { status: 429 }
          );
        }
      }
    }

    // Re-trigger delivery
    const deliveryResult = await notifyOnCompletion(speechId);

    return NextResponse.json({
      success: true,
      delivery: deliveryResult,
    });
  } catch (err) {
    console.error("[speeches/[id]/delivery] POST Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
