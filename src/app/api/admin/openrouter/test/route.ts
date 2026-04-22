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
      // Log failure
      await writeAuditLog({
        actorEmail: user.email ?? undefined,
        action: "test",
        entityType: "openrouter_integration",
        entityId: undefined,
        afterValue: { success: false, error: result.error },
      });

      return NextResponse.json({
        ok: false,
        error: result.error,
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