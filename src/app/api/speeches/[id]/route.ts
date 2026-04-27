import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check: must be authenticated and admin
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: speech, error } = await supabase
      .from("speeches")
      .select(
        "id, first_name, last_name, email, phone, status, transcript, audio_url, answers, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (error || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    return NextResponse.json({ speech });
  } catch (err) {
    console.error("[speeches/[id]] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/speeches/[id] — single delete (admin only).
// To bulk delete, pass `?ids=<id1>,<id2>,<id3>` and any single :id (it's ignored when ids= is set).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

    const { id } = await params;
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const bulkIdsParam = searchParams.get("ids");

    let idsToDelete: string[];
    if (bulkIdsParam && bulkIdsParam.trim()) {
      idsToDelete = bulkIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      idsToDelete = [id];
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: "No speech IDs to delete" }, { status: 400 });
    }

    // Best-effort cleanup of audio files in storage. Errors here are non-fatal.
    try {
      const audioPaths = idsToDelete.map((id) => `${id}.mp3`);
      await supabase.storage.from("speech-audio").remove(audioPaths);
    } catch (storageErr) {
      console.warn("[speeches.DELETE] Audio cleanup failed (non-fatal):", storageErr);
    }

    const { error: deleteError, count } = await supabase
      .from("speeches")
      .delete({ count: "exact" })
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("[speeches.DELETE] DB delete failed:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, deleted: count ?? idsToDelete.length });
  } catch (err) {
    console.error("[speeches.DELETE] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
