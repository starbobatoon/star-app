import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

// GET - List all questions
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, helper_text, feeds_section, is_required, is_active, ghl_field_key, display_order, created_at, updated_at")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[api/admin/questions] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch questions", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions: data || [] });
  } catch (err) {
    console.error("[api/admin/questions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update a question
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, question_text } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    if (question_text === undefined) {
      return NextResponse.json(
        { error: "question_text is required" },
        { status: 400 }
      );
    }

    if (typeof question_text !== 'string' || !question_text.trim()) {
      return NextResponse.json(
        { error: "question_text must be a non-empty string" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("questions")
      .update({ 
        question_text: question_text.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[api/admin/questions] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update question", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ question: data });
  } catch (err) {
    console.error("[api/admin/questions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
