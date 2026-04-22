import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Helper to check admin auth
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const response = NextResponse.json({});
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { error: "Unauthorized", status: 401, user: null };
  }
  
  // Check if user is admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = user.email === adminEmail || user.app_metadata?.role === 'admin';
  
  if (!isAdmin) {
    return { error: "Forbidden: Admin access required", status: 403, user: null };
  }
  
  return { error: null, status: 200, user };
}

// GET - List all questions
export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, feeds_section, is_required, is_visible, ghl_field_key, display_order, created_at, updated_at")
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
    const auth = await checkAdminAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, question_text, feeds_section, is_required, is_visible, ghl_field_key, display_order } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (question_text !== undefined) updateData.question_text = question_text;
    if (feeds_section !== undefined) updateData.feeds_section = feeds_section;
    if (is_required !== undefined) updateData.is_required = is_required;
    if (is_visible !== undefined) updateData.is_visible = is_visible;
    if (ghl_field_key !== undefined) updateData.ghl_field_key = ghl_field_key;
    if (display_order !== undefined) updateData.display_order = display_order;
    
    // Always update updated_at
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("questions")
      .update(updateData)
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

// POST - Create a new question
export async function POST(request: Request) {
  try {
    const auth = await checkAdminAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { question_text, feeds_section = 'map', is_required = true, is_visible = true, ghl_field_key = null } = body;

    if (!question_text || typeof question_text !== 'string') {
      return NextResponse.json(
        { error: "question_text is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Get max display_order
    const { data: maxOrderData } = await supabase
      .from("questions")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();
    
    const nextOrder = (maxOrderData?.display_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("questions")
      .insert({
        question_text,
        feeds_section,
        is_required,
        is_visible,
        ghl_field_key,
        display_order: nextOrder,
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

// DELETE - Delete a question
export async function DELETE(request: Request) {
  try {
    const auth = await checkAdminAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

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
