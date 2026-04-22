import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public speech status endpoint — no authentication required.
 * Used by the compose page to poll for speech generation progress
 * after the user submits their questionnaire.
 *
 * Returns: status, transcript (when available), audioUrl (signed URL when complete)
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

    // Include transcript when text generation is done
    // (status will be "generating_audio" or "complete")
    const textReady =
      speech.status === "generating_audio" ||
      speech.status === "complete" ||
      speech.status === "completed";

    if (textReady && speech.transcript) {
      response.transcript = speech.transcript;
    }

    // Generate a signed URL for audio playback (valid for 1 hour)
    if (speech.audio_storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from("speech-audio")
        .createSignedUrl(speech.audio_storage_path, 3600);

      if (signedUrlData?.signedUrl) {
        response.audioUrl = signedUrlData.signedUrl;
      }
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
