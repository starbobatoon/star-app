import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const { id } = await params;
    const body = await request.json();

    const adminClient = createAdminClient();

    // If setting isActive to true, deactivate all other voices first
    if (body.isActive === true) {
      const { error: deactivateError } = await adminClient
        .from("voices")
        .update({ is_active: false })
        .eq("is_active", true);

      if (deactivateError) {
        console.error("Error deactivating voices:", deactivateError);
        return NextResponse.json(
          { error: "Failed to deactivate existing active voice" },
          { status: 500 }
        );
      }
    }

    // Build update object from allowed fields
    const updateData: Record<string, unknown> = {};
    if (body.label !== undefined) updateData.label = body.label;
    if (body.fishAudioVoiceId !== undefined) updateData.fish_audio_voice_id = body.fishAudioVoiceId;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("voices")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating voice:", error);
      return NextResponse.json(
        { error: "Failed to update voice" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Voice not found" },
        { status: 404 }
      );
    }

    // Transform snake_case back to camelCase for API response
    const voice = {
      id: data.id,
      fishAudioVoiceId: data.fish_audio_voice_id,
      label: data.label,
      sampleUrl: data.sample_url,
      isActive: data.is_active,
      createdAt: data.created_at,
    };

    return NextResponse.json({ voice });
  } catch (err) {
    console.error("Unexpected error updating voice:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const { id } = await params;
    const adminClient = createAdminClient();

    // Check if this voice is currently active
    const { data: voice, error: fetchError } = await adminClient
      .from("voices")
      .select("is_active")
      .eq("id", id)
      .single();

    if (fetchError || !voice) {
      return NextResponse.json(
        { error: "Voice not found" },
        { status: 404 }
      );
    }

    // If deleting active voice, auto-activate next available
    if (voice.is_active) {
      const { data: others } = await adminClient
        .from("voices")
        .select("id")
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (others && others.length > 0) {
        await adminClient
          .from("voices")
          .update({ is_active: true })
          .eq("id", others[0].id);
      }
    }

    const { error: deleteError } = await adminClient
      .from("voices")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting voice:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete voice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error deleting voice:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}