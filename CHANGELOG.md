# Changelog

All notable changes to STAR Speaker AI are documented here.

## [0.3.0] — 2026-04-27

### Fixed

- **TypeScript build** — Resolved `ModelSlot` type error (`"speechwriter"` → `"primary"`) in `speech-generator.ts` and `rating` type assertion in `dashboard-stats/route.ts` that caused Vercel build failures
- **Database schema** — Applied migration 004: renamed `speeches` columns (`user_first_name/last_name/email/phone` → `first_name/last_name/email/phone`), added `transcript` and `updated_at` columns, renamed `ghl_integration.private_integration_token_encrypted` → `pit_encrypted`

### Added

- **Password reset via Resend** — `forgot-password` route now generates a Supabase recovery link server-side and sends a branded HTML email via Resend SDK (`RESEND_API_KEY`, `RESEND_FROM_EMAIL` env vars)
- **GHL Media Library upload** — Audio is now uploaded to GHL's media library after Supabase storage; `audio_ghl_url` stores the GHL URL for direct CRM delivery (falls back to Supabase URL if GHL not configured)
- **Admin Settings page** — New `/admin/settings` page with booking URL field; Star can update her coaching session link without touching env vars
- **Admin credentials auto-seed** — On first pipeline run, Fish Audio / OpenRouter / GHL credentials are encrypted and saved from env vars (`FISH_AUDIO_API_KEY`, `FISH_AUDIO_VOICE_ID`, `OPENROUTER_API_KEY`, `GHL_LOCATION_ID`, `GHL_PIT`)
- **App-scoped admin auth** — `isAdmin()` now requires `app: star-speaker-app` in Supabase `app_metadata`; AutoWebinar admins no longer have access
- **Existing user promotion** — Adding an admin who already exists in Supabase (from another app) promotes them instead of erroring
- **Public `/api/app-config` endpoint** — Returns `bookingUrl` for the end screen; cached at the CDN edge

### Changed

- **Speech end screen** — 18px Georgia serif font for 50+ readability; 420px scrollable transcript panel; real audio progress bar with elapsed/total time; polls for audio URL if not ready; "Schedule a Coaching Session" button driven by DB (admin-editable); email + SMS delivery confirmation
- **Deployment URL** — Live at `https://star-app-weld.vercel.app`

## [0.2.0] — 2026-04-27

### Fixed

- **Audio pipeline** — Corrected bucket name (`speech-audio`), column names (`audio_storage_path`, `audio_ghl_url`), and voice fallback logic in `audio-generator.ts`
- **Speech creation** — Active voice now stamped on the speech record at creation time (`api/speeches/route.ts`)
- **Regeneration endpoint** — Regenerating a speech now triggers the full pipeline (LLM + TTS + upload) instead of only updating the DB record
- **Dashboard stats** — Fixed column references (`first_name`, `last_name`, `email`) in `api/admin/dashboard-stats/route.ts`
- **Admin voice API** — Added `isAdmin` authorization check to GET and POST on `/api/admin/voices` and `/api/admin/voices/preview`
- **Analytics page** — Status string comparisons now match actual DB values (`complete`, `pending`, etc.)
- **Admin overview** — Play / Download / Regenerate buttons wired up with working `onClick` handlers; copyright year made dynamic
- **Mobile nav** — Bottom navigation bar scrolls horizontally and renders all items correctly on small screens
- **Users page** — Password-change and delete-user flows now use in-page modals instead of browser `alert()` / `confirm()` popups
- **Questions page** — Errors surface as inline banners instead of `alert()` calls; fixed design-token import path
- **Design token imports** — All pages now import from `@/lib/design-tokens` (canonical re-export path)
- **Migration deduplication** — Renamed `005_`, `006_`, and `009_` migration files that were duplicated across the `supabase/migrations/` directory
- **Legacy page removed** — Deleted `src/app/admin/(dashboard)/voice/page.tsx` (superseded by `voices/page.tsx`)

### Added

- `supabase/migrations/010_audio_storage_path.sql` — Adds `audio_storage_path TEXT` column to `speeches` table
- `speech-audio` Supabase Storage bucket — Public bucket for storing generated MP3 files

## [0.1.0] — initial release

- Initial Next.js 16 App Router scaffold
- Supabase schema: users, speeches, voices, questions, audit_logs, openrouter_config
- OpenRouter LLM speech generation
- Fish Audio TTS integration
- GoHighLevel CRM sync
- Admin dashboard: overview, model settings, voice config, users, questions, GHL integration, analytics
