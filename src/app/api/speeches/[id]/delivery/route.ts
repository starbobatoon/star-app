import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOnCompletion, type DeliveryStatus } from "@/lib/notify";

/**
 * GET /api/speeches/[id]/delivery
 *
 * Returns the delivery status for a speech — which channels were
 * attempted, which succeeded, and any errors.
 *
 * If delivery_status was not persisted (e.g. column doesn't exist yet),
 * returns a best-effort summary from the speech status field.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: speech, error } = await admin
      .from("speeches")
      .select("id, status, delivery_status, email, phone, completed_at")
      .eq("id", id)
      .single();

    if (error || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
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
 * Useful if the initial delivery failed or the admin configured
 * new channels after the speech was generated.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speechId } = await params;
    const admin = createAdminClient();

    // Verify speech exists and is complete
    const { data: speech, error } = await admin
      .from("speeches")
      .select("id, status")
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
