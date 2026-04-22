import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePDF } from "@/lib/pdf-generator";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check: must be authenticated and admin
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: speech, error } = await supabase
      .from("speeches")
      .select(
        "id, first_name, last_name, hook, story, point, cta, exit"
      )
      .eq("id", id)
      .single();

    if (error || !speech) {
      return NextResponse.json({ error: "Speech not found" }, { status: 404 });
    }

    // Require at least the five transcript sections to generate a PDF
    if (!speech.hook && !speech.story && !speech.point && !speech.cta && !speech.exit) {
      return NextResponse.json(
        { error: "Speech transcript not yet generated" },
        { status: 404 }
      );
    }

    const pdfBuffer = await generatePDF({
      hook: speech.hook ?? "",
      story: speech.story ?? "",
      point: speech.point ?? "",
      cta: speech.cta ?? "",
      exit: speech.exit ?? "",
      title: undefined,
      authorName: [speech.first_name, speech.last_name]
        .filter(Boolean)
        .join(" ") || undefined,
    });

    const lastName = speech.last_name ?? "Speech";
    const filename = `STAR_Speech_${lastName}_${id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[PDF route] Error generating PDF:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}