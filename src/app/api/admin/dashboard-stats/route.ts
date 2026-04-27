import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth-check";
import { seedDefaultsIfNeeded } from "@/lib/seed-defaults";

// GET /api/admin/dashboard-stats
// Returns aggregated stats for the admin dashboard.
// Gracefully degrades if optional columns (rating) or integration tables are unavailable.
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Seed integration credentials from env vars on first admin page load (idempotent)
    await seedDefaultsIfNeeded();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // -- Speeches stats --
    // Try full query first (with rating column). Fall back to query without rating
    // if the migration hasn't been applied yet.
    let speeches = [];
    let ratingAvailable = false;

    {
      const { data, error } = await admin
        .from("speeches")
        .select(
          "status, audio_duration_seconds, rating, created_at, first_name, last_name, email, voice_used, id"
        );

      if (error) {
        // Check if the error is about a missing column (rating not migrated yet)
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("column") && msg.includes("rating")) {
          console.warn(
            "[dashboard-stats] rating column not found in speeches table, falling back to query without rating. Apply migration 007_rating_column.sql to enable ratings."
          );
          // Retry without rating
          const { data: fallbackData, error: fallbackError } = await admin
            .from("speeches")
            .select(
              "status, audio_duration_seconds, created_at, first_name, last_name, email, voice_used, id"
            );
          if (fallbackError) {
            console.error(
              "[dashboard-stats] Failed to fetch speeches (even without rating):",
              fallbackError
            );
            return NextResponse.json(
              { error: "Failed to fetch speeches" },
              { status: 500 }
            );
          }
          speeches = fallbackData ?? [];
          ratingAvailable = false;
        } else {
          // Some other error — not a missing column
          console.error("[dashboard-stats] Failed to fetch speeches:", error);
          return NextResponse.json(
            { error: "Failed to fetch speeches" },
            { status: 500 }
          );
        }
      } else {
        speeches = data ?? [];
        ratingAvailable = true;
      }
    }

    const all = speeches;
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

    // Average rating — only available if rating column exists
    let avgRating: number | null = null;
    let ratedSpeechesCount = 0;
    if (ratingAvailable) {
      const ratedSpeeches = completed.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s) => (s as any).rating != null && (s as any).rating >= 1 && (s as any).rating <= 4
      );
      ratedSpeechesCount = ratedSpeeches.length;
      avgRating =
        ratedSpeeches.length > 0
          ? Math.round(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (ratedSpeeches.reduce((a, s) => a + ((s as any).rating as number), 0) /
                ratedSpeeches.length) *
                10
            ) / 10
          : null;
    } else {
      console.warn(
        "[dashboard-stats] rating unavailable — avgRating and ratedSpeechesCount will be null/0"
      );
    }

    // -- OpenRouter status (graceful fallback if table missing) --
    let openRouterConfigured = false;
    try {
      const { data: orIntegration, error: orError } = await admin
        .from("openrouter_integration")
        .select("is_configured, api_key_encrypted")
        .limit(1)
        .maybeSingle();
      if (orError) throw orError;
      // Configured if flag is set OR if a key exists (key may have been seeded without flag)
      openRouterConfigured = orIntegration?.is_configured === true || !!orIntegration?.api_key_encrypted;
    } catch (orErr: unknown) {
      const msg = orErr instanceof Error ? orErr.message : String(orErr);
      console.warn(
        "[dashboard-stats] openrouter_integration query failed, defaulting to false:",
        msg
      );
    }

    // -- GHL status (graceful fallback if table missing) --
    let ghlConfigured = false;
    try {
      const { data: ghlIntegration, error: ghlError } = await admin
        .from("ghl_integration")
        .select("id, pit_encrypted, location_id")
        .limit(1)
        .maybeSingle();
      if (ghlError) throw ghlError;
      // Configured if a row exists with either a PIT or a location ID
      ghlConfigured = !!(ghlIntegration?.pit_encrypted || ghlIntegration?.location_id);
    } catch (ghlErr: unknown) {
      const msg = ghlErr instanceof Error ? ghlErr.message : String(ghlErr);
      console.warn(
        "[dashboard-stats] ghl_integration query failed, defaulting to false:",
        msg
      );
    }

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
      ratedSpeechesCount,
      openRouterConfigured,
      ghlConfigured,
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
