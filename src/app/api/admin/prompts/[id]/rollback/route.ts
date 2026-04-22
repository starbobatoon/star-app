import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin auth: verify authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch the target prompt version
    const { data: targetPrompt, error: fetchError } = await supabase
      .from("prompts")
      .select("id, version, content, is_active")
      .eq("id", id)
      .single();

    if (fetchError || !targetPrompt) {
      return NextResponse.json(
        { error: "Prompt version not found" },
        { status: 404 }
      );
    }

    // If the target is already active, nothing to rollback to
    if (targetPrompt.is_active) {
      return NextResponse.json(
        { error: "This prompt version is already active" },
        { status: 400 }
      );
    }

    // Get the latest version number for the new row
    const { data: latestPrompt } = await supabase
      .from("prompts")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestPrompt?.version ?? 0) + 1;

    // Deactivate the current active prompt
    const { error: deactivateError } = await supabase
      .from("prompts")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating current prompt:", deactivateError);
      return NextResponse.json(
        { error: "Failed to deactivate current prompt" },
        { status: 500 }
      );
    }

    // Create a NEW prompt row with the old content
    const { data: newPrompt, error: insertError } = await supabase
      .from("prompts")
      .insert({
        version: nextVersion,
        content: targetPrompt.content,
        is_active: true,
        created_by: user.id,
        notes: `Rollback to version ${targetPrompt.version}`,
      })
      .select("id, version, content, is_active")
      .single();

    if (insertError) {
      console.error("Error inserting rollback prompt:", insertError);
      return NextResponse.json(
        { error: "Failed to create rollback prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt: newPrompt }, { status: 201 });
  } catch (err) {
    console.error("Error rolling back prompt:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}