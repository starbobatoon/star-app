import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { testConnection } from "@/lib/openrouter";
import { writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const testSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

export async function POST(request: Request) {
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

    // Parse request body
    const body = await request.json();
    const parsed = testSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { apiKey } = parsed.data;

    // Test the connection via OpenRouter
    const result = await testConnection(apiKey);

    if (!result.ok) {
      // Categorize the error for the UI
      let category = "unknown";
      let userMessage = result.error || "Connection failed";

      if (result.error) {
        const errLower = result.error.toLowerCase();
        if (result.error.includes("401") || errLower.includes("unauthorized") || errLower.includes("invalid api key")) {
          category = "auth";
          userMessage = "Invalid API key. Check that your OpenRouter key is correct and active.";
        } else if (result.error.includes("403") || errLower.includes("forbidden")) {
          category = "auth";
          userMessage = "Access forbidden. Your API key may lack the required permissions.";
        } else if (result.error.includes("429") || errLower.includes("rate limit")) {
          category = "rate_limit";
          userMessage = "Rate limit exceeded. Wait a moment and try again.";
        } else if (errLower.includes("network") || errLower.includes("fetch failed") || errLower.includes("econnrefused")) {
          category = "network";
          userMessage = "Cannot reach OpenRouter. Check your internet connection.";
        }
      }

      // Log failure
      await writeAuditLog({
        actorEmail: user.email ?? undefined,
        action: "test",
        entityType: "openrouter_integration",
        entityId: undefined,
        afterValue: { success: false, category, error: result.error },
      });

      return NextResponse.json({
        ok: false,
        error: userMessage,
        category,
      });
    }

    // Log success
    await writeAuditLog({
      actorEmail: user.email ?? undefined,
      action: "test",
      entityType: "openrouter_integration",
      entityId: undefined,
      afterValue: { success: true, credits: result.credits },
    });

    return NextResponse.json({
      ok: true,
      credits: result.credits,
    });
  } catch (err) {
    console.error("Error testing OpenRouter connection:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}