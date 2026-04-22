# STAR App — Troubleshooting Guide

*Common issues, diagnostic steps, and emergency procedures for the Star Speaker App (STAR App).*

---

## Table of Contents

1. [Speech Generation Failed](#1-speech-generation-failed)
2. [Audio Not Generating](#2-audio-not-generating)
3. [GHL Sync Failed](#3-ghl-sync-failed)
4. [Admin Login Issues](#4-admin-login-issues)
5. [Build Errors](#5-build-errors)
6. [Database Connection Issues](#6-database-connection-issues)
7. [Pipeline Stuck](#7-pipeline-stuck)
8. [Log Locations](#8-log-locations)
9. [Emergency Procedures](#9-emergency-procedures)

---

## 1. Speech Generation Failed

The speech text generation stage calls OpenRouter with the primary model slot. Failures here appear as `status = 'failed'` in the `speeches` table or `generating_text` stuck indefinitely.

### Common Error Messages

| Error Message | Meaning |
|---------------|---------|
| `No active prompt found in database` | The `prompts` table has no row with `is_active = true`. |
| `OpenRouter API error (401)` | Invalid or expired OpenRouter API key. |
| `OpenRouter API error (429)` | Rate limit exceeded or insufficient credits. |
| `OpenRouter API error (5xx)` | OpenRouter server error — usually transient. |
| `OpenRouter returned empty response` | Model returned no content (context overflow or model issue). |
| `Failed to parse AI response` | Model output did not contain all 5 required section headers. |
| `Failed to store speech sections` | Database write error during stage completion. |

### Diagnostic Steps

**Step 1: Check the speech record for the error**

```sql
SELECT id, status, error, model_used, prompt_version, created_at
FROM speeches
WHERE id = 'YOUR_SPEECH_ID';
```

**Step 2: Verify OpenRouter configuration**

```sql
SELECT api_key_preview, is_configured, last_validation_status, credits_remaining_usd
FROM openrouter_integration
LIMIT 1;
```

If `is_configured = false` or `api_key_preview` is NULL, the API key was never saved.

**Step 3: Check the active prompt exists**

```sql
SELECT id, version, is_active, created_at
FROM prompts
WHERE is_active = true;
```

There must be exactly one active prompt. If zero or multiple exist, the query will fail.

**Step 4: Verify the primary model slot**

```sql
SELECT slot, model_id, temperature, max_output_tokens
FROM model_slots
WHERE slot = 'primary';
```

**Step 5: Test OpenRouter connection from the admin panel**

1. Go to `/admin/openrouter`
2. Click **Test Connection**
3. Check the response — it shows remaining credits if successful

### Solutions

| Problem | Fix |
|---------|-----|
| No active prompt | Go to `/admin/prompt` and activate a prompt version. |
| API key invalid | Re-enter the OpenRouter API key in `/admin/openrouter`. |
| Out of credits | Add credits at [openrouter.ai](https://openrouter.ai) or switch to a free-tier model. |
| Model not found | Update the primary slot `model_id` to a valid OpenRouter model ID. |
| Parse failure | The model is ignoring formatting instructions. Try a different model or lower temperature. |

### Retry

Trigger regeneration from the admin panel or via API:

```bash
curl -X POST https://your-domain.com/api/speeches/YOUR_SPEECH_ID/generate \
  -H "Cookie: YOUR_ADMIN_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

Or reset manually via SQL:

```sql
UPDATE speeches
SET status = 'pending', error = NULL, updated_at = NOW()
WHERE id = 'YOUR_SPEECH_ID';
```

Then trigger the pipeline again from the admin dashboard.

---

## 2. Audio Not Generating

The audio generation stage converts the transcript to speech using Fish Audio TTS and stores the result in Supabase Storage.

### Common Error Messages

| Error Message | Meaning |
|---------------|---------|
| `Audio not yet generated for this speech` | The `audio_storage_path` column is NULL. |
| `Audio file not found in storage` | The path exists in the database but the file is missing from the `speech-audio` bucket. |
| `Fish Audio API error` | Invalid API key, voice ID, or service outage. |
| `Storage upload failed` | Supabase Storage permission issue or bucket missing. |

### Diagnostic Steps

**Step 1: Check speech audio status**

```sql
SELECT id, status, audio_storage_path, audio_ghl_url, voice_used, audio_duration_seconds
FROM speeches
WHERE id = 'YOUR_SPEECH_ID';
```

**Step 2: Check the active voice configuration**

```sql
SELECT id, fish_audio_voice_id, label, is_active
FROM voices
WHERE is_active = true;
```

**Step 3: Verify Fish Audio API key**

Check the environment variable on your deployment:

```bash
# Vercel
vercel env ls

# Or check .env.local locally
grep FISH_AUDIO_API_KEY .env.local
```

**Step 4: Check Supabase Storage bucket exists**

In the Supabase dashboard, verify the `speech-audio` bucket exists and has public/private policies set correctly.

**Step 5: Check browser console for audio playback errors**

Open the speech page (`/speech/[id]`), open DevTools Console, and look for:
- `Failed to load resource: net::ERR_...`
- CORS errors on the audio fetch
- `Uncaught (in promise)` errors from the audio player

### Solutions

| Problem | Fix |
|---------|-----|
| No active voice | Go to `/admin/voices` and set a voice as active. |
| Missing API key | Add `FISH_AUDIO_API_KEY` to `.env.local` and redeploy. |
| Invalid voice ID | Update the voice's `fish_audio_voice_id` to a valid Fish Audio voice. |
| Missing bucket | Create the `speech-audio` bucket in Supabase Storage dashboard. |
| CORS errors | Add your domain to the Supabase Storage CORS allowlist. |

### Manual Audio Re-trigger

```sql
-- Reset audio-related fields
UPDATE speeches
SET status = 'generating_audio', audio_storage_path = NULL, audio_ghl_url = NULL
WHERE id = 'YOUR_SPEECH_ID';
```

Then call the generate endpoint or wait for the pipeline to retry.

---

## 3. GHL Sync Failed

The GHL sync stage upserts a contact, sets custom fields, triggers a workflow, and optionally calls an n8n webhook. Failures here are logged but do NOT block the user from viewing their speech.

### Common Error Messages

| Error Message | Meaning |
|---------------|---------|
| `PIT is invalid or expired (401 Unauthorized)` | The Private Integration Token has expired or was revoked in GHL. |
| `Location ... not found (404)` | The `location_id` in `ghl_integration` is incorrect. |
| `PIT does not have access to this location (403 Forbidden)` | The token lacks permissions for the configured location. |
| `PIT does not have the customFields scope` | The GHL app does not have the `customFields.read` and `customFields.write` scopes. |
| `Contact upsert failed` | Network error or malformed contact data. |
| `GHL custom fields update failed` | The `ghl_custom_field_id` in a mapping no longer exists in GHL. |

### Diagnostic Steps

**Step 1: Check GHL integration config**

```sql
SELECT location_id, pit_preview, is_configured, workflow_id, n8n_enabled
FROM ghl_integration
LIMIT 1;
```

**Step 2: Check field mappings**

```sql
SELECT star_data_key, ghl_custom_field_id, ghl_custom_field_name
FROM ghl_field_mappings
ORDER BY star_data_key;
```

**Step 3: Run the GHL connection test**

1. Go to `/admin/ghl-integration`
2. Click **Test Connection**
3. The test checks: location validity, PIT authentication, and custom fields scope

**Step 4: Check the speech record for GHL-specific fields**

```sql
SELECT id, ghl_contact_id, ghl_contact_created, pdf_ghl_url, audio_ghl_url, status, error
FROM speeches
WHERE id = 'YOUR_SPEECH_ID';
```

**Step 5: Check audit log for GHL errors**

```sql
SELECT action, actor_email, entity_id, after_value->>'error' AS error_detail, created_at
FROM audit_log
WHERE entity_type = 'speeches'
  AND action LIKE '%ghl%'
ORDER BY created_at DESC
LIMIT 20;
```

### Solutions

| Problem | Fix |
|---------|-----|
| PIT expired | Generate a new Private Integration Token in GHL and update `/admin/ghl-integration`. |
| Wrong location ID | Copy the correct location ID from your GHL agency dashboard. |
| Missing customFields scope | Reinstall the GHL app with the `customFields.read` and `customFields.write` scopes. |
| Custom field deleted in GHL | Go to `/admin/ghl-integration`, re-map the field to a valid GHL custom field ID. |
| Workflow not triggering | Verify the `workflow_id` exists and is published in GHL. |

### Manual GHL Re-sync

```sql
-- Reset to allow re-sync
UPDATE speeches
SET status = 'generating_audio', ghl_contact_id = NULL, ghl_contact_created = false
WHERE id = 'YOUR_SPEECH_ID';
```

Then trigger the pipeline again.

---

## 4. Admin Login Issues

Admin authentication uses Supabase Auth with email/password. The middleware (`src/middleware.ts`) protects all `/admin/*` routes.

### Common Error Messages

| Error Message | Meaning |
|---------------|---------|
| `Invalid email address` | The email format failed Zod validation. |
| `Invalid login credentials` | Wrong email or password (returned by Supabase Auth). |
| `Unauthorized` (401 on API) | Session cookie is missing, expired, or invalid. |
| Redirect loop to `/admin/login` | Session exists but middleware rejects it, or cookie is not being set. |
| `Email not confirmed` | Supabase Auth requires email confirmation and it is not disabled. |

### Diagnostic Steps

**Step 1: Check if the admin user exists in Supabase Auth**

In the Supabase dashboard, go to **Authentication > Users** and search for the admin email (default: `trevor@blackceo.com`).

**Step 2: Check environment variables**

```bash
grep -E "NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|ADMIN_EMAIL" .env.local
```

All three must be set correctly.

**Step 3: Test the session endpoint**

```bash
curl -b "YOUR_COOKIES" https://your-domain.com/api/auth/session
```

A valid session returns `{ user: { ... } }`. Invalid returns `{ error: "Unauthorized" }`.

**Step 4: Check browser cookies**

Open DevTools > Application > Cookies > your domain. Look for:
- `sb-access-token`
- `sb-refresh-token`
- Any `supabase-auth-token` variants

If cookies are missing after login, the `setAll` cookie logic in `src/lib/supabase/server.ts` may be failing.

**Step 5: Check middleware logs**

Vercel logs for middleware:

```bash
vercel logs --json | grep -i "middleware\|unauthorized\|redirect"
```

### Solutions

| Problem | Fix |
|---------|-----|
| Wrong password | Reset via Supabase dashboard or update `ADMIN_INITIAL_PASSWORD` and recreate the user. |
| User does not exist | Create the user in Supabase Auth dashboard with the email from `ADMIN_EMAIL`. |
| Session cookie not persisting | Ensure `NEXT_PUBLIC_SUPABASE_URL` matches the domain (no trailing slash). |
| Email confirmation required | Disable email confirmation in Supabase Auth settings or confirm the email manually. |
| CORS issues on login | Add your domain to Supabase Auth > URL Configuration > Redirect URLs. |

### Emergency: Create Admin User Directly

If locked out entirely, create a user directly in the Supabase dashboard:

1. Go to **Authentication > Users**
2. Click **Add user**
3. Enter the email from `ADMIN_EMAIL`
4. Set a password
5. Disable **Auto-confirm user** if you want immediate access, or confirm the email after creation

---

## 5. Build Errors

Build-time errors prevent deployment. These must be fixed before `npm run build` succeeds.

### Common Error Messages

| Error Message | Meaning |
|---------------|---------|
| `Cannot find module '@/lib/...'` | Path alias `@/` is not resolving — check `tsconfig.json` `paths`. |
| `Module not found: 'zod'` | Missing dependency — run `npm install`. |
| `Type error: Property '...' does not exist on type '...'` | TypeScript type mismatch. |
| `ENCRYPTION_KEY is not set` | Environment variable missing at build time (for static analysis). |
| `SyntaxError: Cannot use import statement outside a module` | File is missing `"use server"` or `import "server-only"` directive. |
| `Middleware error: Response cookie was not set` | `createServerClient` in middleware is not passing `response` to `setAll`. |

### Diagnostic Steps

**Step 1: Run a local build**

```bash
cd /tmp/star-app
npm run build
```

**Step 2: Check TypeScript compilation**

```bash
npx tsc --noEmit
```

**Step 3: Check for missing environment variables**

The build may fail if code references `process.env.X` without a fallback. Check all required vars:

```bash
grep -r "process.env\." src/ | grep -v "||" | grep -v "??"
```

**Step 4: Check for client/server boundary violations**

```bash
grep -r "server-only" src/app/ --include="*.tsx" | head -20
grep -r "use client" src/lib/ --include="*.ts" | head -20
```

Server-only modules (`src/lib/encryption.ts`, `src/lib/openrouter.ts`, `src/lib/pipeline.ts`) must never be imported from client components.

### Solutions

| Problem | Fix |
|---------|-----|
| Missing dependency | `npm install <package>` |
| Type error | Add proper types or `as any` with a TODO comment for temporary bypass. |
| Missing env var | Add a fallback (`process.env.X || ''`) or add the var to `.env.local`. |
| Client importing server-only | Move the import to a Server Component or create an API route. |
| Middleware cookie issue | Ensure `response` is passed to `createServerClient` and `setAll` mutates it. |

---

## 6. Database Connection Issues

The app uses Supabase PostgreSQL with Row Level Security (RLS). Connection issues affect all features.

### Common Error Messages

| Error Message | Meaning |
|---------------|---------|
| `Failed to read OpenRouter integration: ...` | Cannot connect to Supabase from server code. |
| `new row violates row-level security policy` | The Supabase client lacks auth context for the operation. |
| `relation "speeches" does not exist` | Migrations have not been applied to the database. |
| `permission denied for table` | The service role key does not have permission, or RLS is misconfigured. |
| `connect ECONNREFUSED` | Network issue or wrong `NEXT_PUBLIC_SUPABASE_URL`. |
| `JWT expired` | The anon key or service role key has expired or is invalid. |

### Diagnostic Steps

**Step 1: Verify Supabase URL and keys**

```bash
grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY" .env.local
```

**Step 2: Test database connectivity from the command line**

```bash
# Using psql (if available)
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -c "SELECT COUNT(*) FROM speeches;"
```

**Step 3: Check if migrations are applied**

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM speeches;
SELECT COUNT(*) FROM prompts;
SELECT COUNT(*) FROM voices;
```

If any table does not exist, run migrations:

```bash
npx supabase db push
```

**Step 4: Check RLS policies**

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Step 5: Verify the admin client can bypass RLS**

The `createAdminClient()` function in `src/lib/supabase/admin.ts` uses the service role key, which bypasses RLS. If this fails, the service role key is wrong.

```sql
-- Test with service role (via admin client)
SELECT * FROM openrouter_integration LIMIT 1;
```

### Solutions

| Problem | Fix |
|---------|-----|
| Wrong URL | Copy the correct Project URL from Supabase dashboard > Settings > API. |
| Wrong anon key | Copy the `anon public` key from Supabase dashboard > Settings > API. |
| Wrong service role key | Copy the `service_role` key from Supabase dashboard > Settings > API. Keep it secret. |
| Migrations not applied | Run `npx supabase db push` or apply migrations manually in the SQL Editor. |
| RLS blocking admin ops | Admin client should use service role key. If RLS still blocks, check policy definitions. |
| Network issue | Ensure the Supabase project is not paused (free tier pauses after 7 days of inactivity). |

### Emergency: Direct SQL Access

If the app cannot connect but you need to fix data, use the Supabase SQL Editor directly:

1. Go to Supabase dashboard > SQL Editor
2. Run queries directly against the database
3. The SQL Editor bypasses RLS (uses superuser)

---

## 7. Pipeline Stuck

The speech pipeline runs asynchronously. A speech can get stuck in an intermediate status if the process crashes, the server restarts mid-pipeline, or an unhandled exception occurs.

### Valid Status Flow

```
pending -> upserting_contact -> generating_text -> generating_audio -> uploading -> syncing_ghl -> complete
                                    |
                                    v
                                  failed
```

### Common Stuck States

| Stuck Status | Likely Cause |
|--------------|--------------|
| `pending` | Pipeline was never triggered (fire-and-forget failed to start). |
| `generating_text` | OpenRouter call hung or server restarted during generation. |
| `generating_audio` | Fish Audio call hung or server restart. |
| `syncing_ghl` | GHL API hung or network timeout. |
| `failed` with NULL `error` | The failSpeech helper itself threw an exception. |

### Diagnostic Steps

**Step 1: Find stuck speeches**

```sql
-- Speeches stuck for more than 10 minutes
SELECT id, status, error, created_at, NOW() - created_at AS age
FROM speeches
WHERE status NOT IN ('pending', 'complete', 'failed')
  AND created_at < NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

**Step 2: Check for speeches stuck in pending**

```sql
SELECT id, status, created_at, NOW() - created_at AS age
FROM speeches
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**Step 3: Check audit log for pipeline starts without completions**

```sql
SELECT entity_id, action, created_at
FROM audit_log
WHERE action IN ('pipeline_stage_start', 'pipeline_stage_failed', 'pipeline_complete')
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;
```

**Step 4: Check server logs**

Vercel:
```bash
vercel logs --json | grep -E "pipeline|speech-generator|audio-generator|ghl-sync"
```

Local:
```bash
npm run dev 2>&1 | tee dev.log
```

### Solutions

#### Option A: Reset and re-trigger from admin panel

1. Go to `/admin`
2. Find the stuck speech
3. Click **Regenerate** or **Retry**

#### Option B: Reset via SQL and trigger via API

```sql
UPDATE speeches
SET status = 'pending', error = NULL, updated_at = NOW()
WHERE id = 'YOUR_SPEECH_ID';
```

Then call:

```bash
curl -X POST https://your-domain.com/api/speeches/YOUR_SPEECH_ID/generate \
  -H "Cookie: YOUR_ADMIN_SESSION_COOKIE"
```

#### Option C: Force status to failed (if speech is unrecoverable)

```sql
UPDATE speeches
SET status = 'failed',
    error = 'Manually marked failed by admin — unrecoverable',
    updated_at = NOW()
WHERE id = 'YOUR_SPEECH_ID';
```

#### Option D: Bulk reset all stuck speeches

```sql
-- Reset all speeches stuck in non-terminal states for > 30 minutes
UPDATE speeches
SET status = 'pending', error = NULL, updated_at = NOW()
WHERE status NOT IN ('complete', 'failed')
  AND created_at < NOW() - INTERVAL '30 minutes';
```

> **Warning:** Bulk reset will cause all affected speeches to re-run the pipeline. Monitor OpenRouter credits and GHL API rate limits.

---

## 8. Log Locations

### Audit Log Table

The primary source of truth for admin actions and pipeline events.

```sql
-- Recent admin actions
SELECT action, actor_email, entity_type, entity_id, created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 50;

-- Pipeline events for a specific speech
SELECT action, after_value, created_at
FROM audit_log
WHERE entity_id = 'YOUR_SPEECH_ID'
ORDER BY created_at;

-- Error events only
SELECT action, entity_id, after_value->>'error' AS error, created_at
FROM audit_log
WHERE after_value->>'error' IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Browser Console

- **Speech page errors**: Open `/speech/[id]`, press F12, check Console for audio/player errors.
- **Admin page errors**: Open any `/admin/*` page, check Console for React/Next.js errors.
- **Network tab**: Check for failed API calls (red entries in the Network tab).

### Vercel Logs

```bash
# Stream logs
vercel logs

# Filter for errors
vercel logs --json | jq 'select(.level == "error")'

# Filter for a specific speech ID
vercel logs --json | grep "YOUR_SPEECH_ID"
```

### Server Console (Local Dev)

```bash
npm run dev 2>&1 | tee star-app-dev.log
```

All `console.error` and `console.log` statements from server code appear here.

### Supabase Logs

In the Supabase dashboard:
- **Database > Logs**: PostgreSQL query logs
- **Auth > Logs**: Authentication events
- **Storage > Logs**: File upload/download events

---

## 9. Emergency Procedures

### Procedure 1: Mark a Speech Complete Manually

If a speech generated successfully but the status did not update (e.g., GHL sync failed after audio generated):

```sql
UPDATE speeches
SET status = 'complete',
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = 'YOUR_SPEECH_ID';
```

### Procedure 2: Fix a Broken Prompt

If the active prompt is corrupted and all speeches are failing:

```sql
-- Deactivate the broken prompt
UPDATE prompts SET is_active = false WHERE is_active = true;

-- Insert a working fallback prompt
INSERT INTO prompts (version, content, is_active, notes)
VALUES (
  (SELECT COALESCE(MAX(version), 0) + 1 FROM prompts),
  'You are a master speechwriter... [fallback prompt text]',
  true,
  'Emergency fallback prompt inserted during incident'
);
```

### Procedure 3: Reset All Integration Configs

If you suspect encrypted data corruption (wrong `ENCRYPTION_KEY` or data migration issue):

```sql
-- Reset OpenRouter config (requires re-entry in admin panel)
UPDATE openrouter_integration
SET api_key_encrypted = NULL,
    api_key_preview = NULL,
    is_configured = false,
    updated_at = NOW();

-- Reset GHL config (requires re-entry in admin panel)
UPDATE ghl_integration
SET private_integration_token_encrypted = NULL,
    pit_preview = NULL,
    is_configured = false,
    updated_at = NOW();
```

### Procedure 4: Re-run All Failed Speeches

```sql
-- Queue all failed speeches for retry
UPDATE speeches
SET status = 'pending', error = NULL, updated_at = NOW()
WHERE status = 'failed';
```

Then trigger each via the admin panel or a script calling the generate endpoint.

### Procedure 5: Database Backup Before Emergency Changes

Always back up the `speeches` table before bulk updates:

```sql
-- Create a backup table
CREATE TABLE speeches_backup_YYYYMMDD AS
SELECT * FROM speeches;

-- Or export to CSV via Supabase SQL Editor
COPY speeches TO '/tmp/speeches_backup.csv' WITH CSV HEADER;
```

### Procedure 6: Check System Health Overview

Run this diagnostic query for a quick health check:

```sql
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'complete') AS complete_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE status NOT IN ('complete', 'failed')) AS in_progress_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h_count,
    MAX(created_at) AS latest_speech
  FROM speeches
)
SELECT * FROM stats;
```

---

*Document version: 1.0 | Last updated: 2026-04-22*
*For issues not covered here, check the audit_log table and Vercel/server logs first.*
