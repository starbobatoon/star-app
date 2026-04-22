import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    console.log("[api/questions] Starting request");
    
    // Check env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[api/questions] Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const supabase = createAdminClient();
    console.log("[api/questions] Supabase client created");

    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, feeds_section, is_required, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[api/questions] Database error:", error.message, error.code);
      return NextResponse.json(
        { error: "Failed to fetch questions", details: error.message },
        { status: 500 }
      );
    }

    console.log("[api/questions] Success, returning", data?.length || 0, "questions");
    return NextResponse.json({ questions: data || [] });
    
  } catch (err) {
    console.error("[api/questions] Unexpected error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
