import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { testConnection } from "@/lib/openrouter";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST(request: Request) {
  try {
    // Admin auth
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accept an optional apiKey from the request body
    let providedKey: string | undefined;
    try {
      const body = await request.json();
      if (body?.apiKey && typeof body.apiKey === "string" && body.apiKey.trim()) {
        providedKey = body.apiKey.trim();
      }
    } catch { /* empty body is fine */ }

    // If no key was provided, use the one saved in the DB
    let apiKey = providedKey;
    if (!apiKey) {
      const admin = createAdminClient();
      const { data: integration } = await admin
        .from("openrouter_integration")
        .select("api_key_encrypted, is_configured")
        .limit(1)
        .maybeSingle();

      if (!integration?.is_configured || !integration.api_key_encrypted) {
        return NextResponse.json(
          { ok: false, error: "No API key saved. Enter your OpenRouter key and save it first.", category: "missing" },
          { status: 400 }
        );
      }

      try {
        apiKey = decrypt(integration.api_key_encrypted);
      } catch {
        return NextResponse.json(
          { ok: false, error: "Failed to decrypt saved API key. Ensure ENCRYPTION_KEY is set in Vercel.", category: "config" },
          { status: 500 }
        );
      }
    }

    // Run the actual connection test
    const result = await testConnection(apiKey);

    if (!result.ok) {
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
      await writeAuditLog({ actorEmail: user.email ?? undefined, action: "test", entityType: "openrouter_integration", afterValue: { success: false, category, error: result.error } });
      return NextResponse.json({ ok: false, error: userMessage, category });
    }

    // Persist credits and validation timestamp so the dashboard can show them without a live call
    try {
      const admin = createAdminClient();
      const { data: orRow } = await admin
        .from("openrouter_integration")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (orRow?.id) {
        await admin.from("openrouter_integration").update({
          credits_remaining_usd: result.credits ?? null,
          last_validated_at: new Date().toISOString(),
          last_validation_status: "connected",
        }).eq("id", orRow.id);
      }
    } catch { /* non-fatal */ }

    await writeAuditLog({ actorEmail: user.email ?? undefined, action: "test", entityType: "openrouter_integration", afterValue: { success: true, credits: result.credits } });
    return NextResponse.json({ ok: true, credits: result.credits });
  } catch (err) {
    console.error("[openrouter/test] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
