import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDecryptedApiKey, listModels } from "@/lib/openrouter";

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

    // Get decrypted API key — graceful when not configured
    let apiKey: string;
    try {
      apiKey = await getDecryptedApiKey();
    } catch {
      return NextResponse.json({
        models: [],
        error: "No API key configured",
      });
    }

    // List models from OpenRouter
    const models = await listModels(apiKey);

    return NextResponse.json({ models });
  } catch (err) {
    console.error("Error listing OpenRouter models:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}