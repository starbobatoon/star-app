import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

// ─── Shared shape ──────────────────────────────────────────────────

interface KbDocument {
  id: string;
  title: string;
  contentLength: number;
  createdAt: string;
}

function rowToDocument(row: {
  id: string;
  notes: string | null;
  content: string | null;
  created_at: string;
}): KbDocument {
  return {
    id: row.id,
    title: (row.notes ?? "").replace(/^kb:/, ""),
    contentLength: (row.content ?? "").length,
    createdAt: row.created_at,
  };
}

// ─── POST body schema ──────────────────────────────────────────────

const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

// ─── GET /api/admin/knowledge-base ────────────────────────────────

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("prompts")
      .select("id, notes, content, created_at")
      .eq("is_active", false)
      .like("notes", "kb:%")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching KB documents:", error);
      return NextResponse.json(
        { error: "Failed to fetch knowledge base documents" },
        { status: 500 }
      );
    }

    const documents: KbDocument[] = (data ?? []).map(rowToDocument);

    return NextResponse.json({ documents });
  } catch (err) {
    console.error("Unexpected error in GET /api/admin/knowledge-base:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/admin/knowledge-base ───────────────────────────────

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, content } = parsed.data;

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("prompts")
      .insert({
        notes: `kb:${title}`,
        content,
        is_active: false,
        version: 0,
      })
      .select("id, notes, content, created_at")
      .single();

    if (error) {
      console.error("Error inserting KB document:", error);
      return NextResponse.json(
        { error: "Failed to create knowledge base document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ document: rowToDocument(data) }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /api/admin/knowledge-base:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/knowledge-base?id={uuid} ───────────────────

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("prompts")
      .delete()
      .eq("id", id)
      .like("notes", "kb:%");

    if (error) {
      console.error("Error deleting KB document:", error);
      return NextResponse.json(
        { error: "Failed to delete knowledge base document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/admin/knowledge-base:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
