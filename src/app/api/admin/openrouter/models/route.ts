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
    try {
      const models = await listModels(apiKey);
      return NextResponse.json({ models });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error listing OpenRouter models:", msg);

      let category = "api";
      let userMessage = msg;
      let status = 502;

      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        category = "auth";
        userMessage = "Cannot list models: API key is invalid or expired.";
        status = 401;
      } else if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
        category = "rate_limit";
        userMessage = "Rate limit exceeded while fetching models. Try again later.";
        status = 429;
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch failed")) {
        category = "network";
        userMessage = "Cannot reach OpenRouter to list models. Check your connection.";
        status = 502;
      }

      return NextResponse.json({ models: [], error: userMessage, category }, { status });
    }
  } catch (err) {
    console.error("Error listing OpenRouter models:", err);
    return NextResponse.json(
      { error: "Internal server error", category: "unknown" },
      { status: 500 }
    );
  }
}
