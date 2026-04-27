import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { isAdmin } from "@/lib/auth-check";

// ── GET /api/admin/voices ───────────────────────────────────────────────────
// Lists all voices. Requires admin auth.

export async function GET() {
  try {
    // Admin auth: verify authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Fetch all voices, newest first
    const { data: voices, error } = await supabase
      .from("voices")
      .select("id, fish_audio_voice_id, label, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching voices:", error);
      return NextResponse.json(
        { error: "Failed to fetch voices" },
        { status: 500 }
      );
    }

    return NextResponse.json({ voices });
  } catch (err) {
    console.error("Error listing voices:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST /api/admin/voices ──────────────────────────────────────────────────
// Adds a new voice. Requires admin auth. Only one active voice at a time.

const createVoiceSchema = z.object({
  fishAudioVoiceId: z.string().min(1, "fishAudioVoiceId is required"),
  label: z.string().min(1, "label is required"),
  isActive: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    // Admin auth: verify authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = createVoiceSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { fishAudioVoiceId, label, isActive } = parsed.data;
    const adminClient = createAdminClient();

    // If the new voice should be active, deactivate all other voices first
    // (only one active voice at a time)
    if (isActive) {
      const { error: deactivateError } = await adminClient
        .from("voices")
        .update({ is_active: false })
        .eq("is_active", true);

      if (deactivateError) {
        console.error("Error deactivating voices:", deactivateError);
        return NextResponse.json(
          { error: "Failed to deactivate previous voices" },
          { status: 500 }
        );
      }
    }

    // Insert the new voice
    const { data: newVoice, error: insertError } = await adminClient
      .from("voices")
      .insert({
        fish_audio_voice_id: fishAudioVoiceId,
        label,
        is_active: isActive,
      })
      .select("id, fish_audio_voice_id, label, is_active, created_at")
      .single();

    if (insertError) {
      console.error("Error inserting voice:", insertError);
      return NextResponse.json(
        { error: "Failed to create voice" },
        { status: 500 }
      );
    }

    // Audit log
    await writeAuditLog({
      actorEmail: user.email,
      action: "create",
      entityType: "voices",
      entityId: newVoice.id,
      afterValue: newVoice,
    });

    return NextResponse.json({ voice: newVoice }, { status: 201 });
  } catch (err) {
    console.error("Error creating voice:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}