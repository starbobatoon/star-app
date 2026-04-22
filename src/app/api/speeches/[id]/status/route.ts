import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public speech status endpoint — no authentication required.
 * Used by the compose page to poll for speech generation progress
 * after the user submits their questionnaire.
 *
 * Returns: status, transcript (when complete), audioUrl (when complete)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: speech, error } = await supabase
      .from("speeches")
      .select("id, status, transcript, audio_url, audio_storage_path, created_at, completed_at")
      .eq("id", id)
      .single();

    if (error || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    // Build a public-safe response
    const response: Record<string, unknown> = {
      id: speech.id,
      status: speech.status,
      createdAt: speech.created_at,
      completedAt: speech.completed_at,
    };

    // Include transcript and audio URL when the speech is complete
    if (speech.status === "complete" || speech.status === "completed") {
      response.transcript = speech.transcript;
      response.audioUrl = speech.audio_storage_path
        ? `/api/speeches/${speech.id}/audio`
        : null;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[speeches/[id]/status] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
