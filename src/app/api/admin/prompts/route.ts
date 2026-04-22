import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
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

    // List all prompt versions, newest first
    const { data: prompts, error } = await supabase
      .from("prompts")
      .select("id, version, content, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prompts:", error);
      return NextResponse.json(
        { error: "Failed to fetch prompts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompts });
  } catch (err) {
    console.error("Error listing prompts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    // Parse request body
    const body = await request.json();
    const content = body.content;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Get the latest version number
    const { data: latestPrompt } = await supabase
      .from("prompts")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestPrompt?.version ?? 0) + 1;

    // Deactivate all existing active prompts
    const { error: deactivateError } = await supabase
      .from("prompts")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating prompts:", deactivateError);
      return NextResponse.json(
        { error: "Failed to deactivate previous prompts" },
        { status: 500 }
      );
    }

    // Insert new prompt version
    const { data: newPrompt, error: insertError } = await supabase
      .from("prompts")
      .insert({
        version: nextVersion,
        content: content.trim(),
        is_active: true,
        created_by: user.id,
      })
      .select("id, version, content, is_active")
      .single();

    if (insertError) {
      console.error("Error inserting prompt:", insertError);
      return NextResponse.json(
        { error: "Failed to create prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt: newPrompt }, { status: 201 });
  } catch (err) {
    console.error("Error creating prompt:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}