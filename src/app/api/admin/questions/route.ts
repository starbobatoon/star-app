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

// POST - Create a new question
export async function POST(request: Request) {
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
    const { question_text, helper_text, feeds_section, is_required, is_active, ghl_field_key, display_order } = body;

    if (!question_text || typeof question_text !== 'string' || !question_text.trim()) {
      return NextResponse.json(
        { error: "question_text is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!feeds_section || typeof feeds_section !== 'string') {
      return NextResponse.json(
        { error: "feeds_section is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // If no display_order provided, get the max and add 1
    let order = display_order;
    if (order === undefined || order === null) {
      const { data: maxData } = await supabase
        .from("questions")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .single();
      order = (maxData?.display_order || 0) + 1;
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        question_text: question_text.trim(),
        helper_text: helper_text || null,
        feeds_section: feeds_section.trim(),
        is_required: is_required ?? true,
        is_active: is_active ?? true,
        ghl_field_key: ghl_field_key || null,
        display_order: order,
      })
      .select()
      .single();

    if (error) {
      console.error("[api/admin/questions] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to create question", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ question: data }, { status: 201 });
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Validate question_text if provided
    if (updates.question_text !== undefined) {
      if (typeof updates.question_text !== 'string' || !updates.question_text.trim()) {
        return NextResponse.json(
          { error: "question_text must be a non-empty string" },
          { status: 400 }
        );
      }
      updates.question_text = updates.question_text.trim();
    }

    // Validate feeds_section if provided
    if (updates.feeds_section !== undefined) {
      if (typeof updates.feeds_section !== 'string' || !updates.feeds_section.trim()) {
        return NextResponse.json(
          { error: "feeds_section must be a non-empty string" },
          { status: 400 }
        );
      }
      updates.feeds_section = updates.feeds_section.trim();
    }

    // Only allow known fields
    const allowedFields = ['question_text', 'helper_text', 'feeds_section', 'is_required', 'is_active', 'ghl_field_key', 'display_order'];
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("questions")
      .update(filteredUpdates)
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

// DELETE - Remove a question
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[api/admin/questions] Delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete question", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/admin/questions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
