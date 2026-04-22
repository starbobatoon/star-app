import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/instructions — fetch the active AI instruction set
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("ai_instructions")
      .select("id, system_prompt, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no active instruction exists, return an empty one
      if (error.code === "PGRST116") {
        return NextResponse.json({
          instruction: {
            id: null,
            system_prompt: "",
            is_active: false,
            created_at: null,
            updated_at: null,
          },
        });
      }
      console.error("[admin/instructions] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch instructions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ instruction: data });
  } catch (err) {
    console.error("[admin/instructions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/instructions — update or create the AI instruction set
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { system_prompt } = body;

    if (
      !system_prompt ||
      typeof system_prompt !== "string" ||
      system_prompt.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "system_prompt is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Deactivate all existing active instructions
    const { error: deactivateError } = await supabase
      .from("ai_instructions")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      console.error(
        "[admin/instructions] Deactivate error:",
        deactivateError
      );
      return NextResponse.json(
        { error: "Failed to deactivate previous instructions" },
        { status: 500 }
      );
    }

    // Insert new instruction
    const { data, error: insertError } = await supabase
      .from("ai_instructions")
      .insert({
        system_prompt: system_prompt.trim(),
        is_active: true,
      })
      .select("id, system_prompt, is_active, updated_at")
      .single();

    if (insertError) {
      console.error("[admin/instructions] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save instructions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ instruction: data });
  } catch (err) {
    console.error("[admin/instructions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
