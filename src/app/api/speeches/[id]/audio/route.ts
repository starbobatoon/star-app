import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";

export async function GET(
  request: NextRequest,
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

    // Fetch speech record to get audio_storage_path
    const { data: speech, error: dbError } = await supabase
      .from("speeches")
      .select("id, audio_storage_path")
      .eq("id", id)
      .single();

    if (dbError || !speech) {
      return NextResponse.json(
        { error: "Speech not found" },
        { status: 404 }
      );
    }

    if (!speech.audio_storage_path) {
      return NextResponse.json(
        { error: "Audio not yet generated for this speech" },
        { status: 404 }
      );
    }

    // Download the audio file from Supabase Storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from("speech-audio")
      .download(speech.audio_storage_path);

    if (storageError || !fileData) {
      return NextResponse.json(
        { error: "Audio file not found in storage" },
        { status: 404 }
      );
    }

    // Convert Blob to ArrayBuffer for streaming
    const arrayBuffer = await fileData.arrayBuffer();
    const fileSize = arrayBuffer.byteLength;

    // Handle Range requests for partial content
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
      if (matches) {
        const start = parseInt(matches[1], 10);
        const end = matches[2] ? parseInt(matches[2], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          return new NextResponse(null, {
            status: 416, // Range Not Satisfiable
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
          });
        }

        const chunkSize = end - start + 1;
        const chunk = arrayBuffer.slice(start, end + 1);

        return new NextResponse(chunk, {
          status: 206, // Partial Content
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": chunkSize.toString(),
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    // Full response
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error streaming speech audio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}