import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/dashboard-stats
// Returns aggregated stats for the admin dashboard.
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // -- Speeches stats (via RPC or manual queries) --
    const { data: speeches, error: speechesError } = await admin
      .from("speeches")
      .select("status, audio_duration_seconds, rating, created_at, first_name, last_name, email, voice_used, id");

    if (speechesError) {
      console.error("[dashboard-stats] Failed to fetch speeches:", speechesError);
      return NextResponse.json(
        { error: "Failed to fetch speeches" },
        { status: 500 }
      );
    }

    const all = speeches ?? [];
    const completed = all.filter((s) => s.status === "complete");
    const pending = all.filter((s) =>
      ["pending", "upserting_contact", "generating_text", "generating_audio", "uploading", "syncing_ghl"].includes(s.status)
    );
    const failed = all.filter((s) => s.status === "failed");

    // Average duration (completed only, non-null)
    const durations = completed
      .map((s) => s.audio_duration_seconds)
      .filter((d): d is number => d != null && d > 0);
    const avgDurationSeconds =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    // Average rating (completed with rating, 1-4 scale)
    const ratedSpeeches = completed.filter(
      (s) => s.rating != null && s.rating >= 1 && s.rating <= 4
    );
    const avgRating =
      ratedSpeeches.length > 0
        ? Math.round(
            (ratedSpeeches.reduce((a, s) => a + (s.rating as number), 0) /
              ratedSpeeches.length) *
              10
          ) / 10
        : null;

    // -- OpenRouter status --
    const { data: orIntegration } = await admin
      .from("openrouter_integration")
      .select("is_configured")
      .limit(1)
      .maybeSingle();

    // -- GHL status --
    const { data: ghlIntegration } = await admin
      .from("ghl_integration")
      .select("is_configured")
      .limit(1)
      .maybeSingle();

    // -- Recent speeches for the activity table --
    const recentSpeeches = all
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 6)
      .map((s) => ({
        id: s.id,
        title:
          `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email,
        status: s.status,
        voiceProfile: s.voice_used ?? "Default",
        duration:
          s.audio_duration_seconds != null
            ? `${Math.floor(s.audio_duration_seconds / 60)}:${String(s.audio_duration_seconds % 60).padStart(2, "0")}`
            : "--:--",
        createdAt: s.created_at,
      }));

    return NextResponse.json({
      totalSpeeches: all.length,
      completedSpeeches: completed.length,
      pendingSpeeches: pending.length,
      failedSpeeches: failed.length,
      avgDurationSeconds,
      avgRating,
      ratedSpeechesCount: ratedSpeeches.length,
      openRouterConfigured: orIntegration?.is_configured === true,
      ghlConfigured: ghlIntegration?.is_configured === true,
      recentSpeeches,
    });
  } catch (err) {
    console.error("[dashboard-stats] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
