# STAR App Security Audit

**Date:** 2026-04-22  
**Agent:** W6-02 (Security QC)  
**Scope:** Full-stack security review of /tmp/star-app  

---

## Executive Summary

| Category | Status | Severity |
|----------|--------|----------|
| a) Secrets in client bundle | **PASS** | — |
| b) Admin route protection | **PARTIAL** | HIGH |
| c) RLS policies on Supabase | **PARTIAL** | HIGH |
| d) Encrypted credential storage | **PASS** | — |
| e) Idempotency enforcement | **PASS** | — |
| f) Rate limiting | **NOT IMPLEMENTED** | MEDIUM |
| g) Input validation | **PARTIAL** | HIGH |
| h) CORS and security headers | **FAIL** | HIGH |

**Critical finding:** Schema column name mismatches between migrations and application code will cause runtime errors in the GHL integration and speech creation flows.

---

## a) No Secrets in Client Bundle — PASS

### Evidence

1. **Client-side env vars are only public Supabase keys:**
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only `NEXT_PUBLIC_` variables referenced in client code (`src/lib/supabase/client.ts:5-6`, `src/middleware.ts:21-22`). Both are public by design.
   - No `NEXT_PUBLIC_` vars found in any component files under `src/components/` or `src/app/` page components.

2. **Service role key is server-only:**
   - `SUPABASE_SERVICE_ROLE_KEY` is referenced only in `src/lib/supabase/admin.ts:6` which has no `NEXT_PUBLIC_` prefix, ensuring it never reaches the client bundle.

3. **Encryption module is server-only:**
   - `src/lib/encryption.ts` uses Node.js `crypto` and is never imported from client components. The header comment explicitly states "must only run server-side."

4. **OpenRouter and GHL modules are server-only:**
   - `src/lib/openrouter.ts:12` — `import "server-only"`.
   - `src/lib/ghl-sync.ts:11` — `import "server-only"`.
   - `src/lib/audit-log.ts:2` — `import "server-only"`.

5. **No hardcoded secrets in client code:**
   - Searched all files under `src/app/` and `src/components/` for patterns: `api_key`, `API_KEY`, `secret`, `password`, `token`, `sk-`, `pk_`, `AKIA`, `ghp_`. Only UI-related references found (input placeholders, form fields). No actual secret values.
   - `src/app/admin/openrouter/page.tsx:272` — placeholder text `"sk-or-v1-..."` only.

6. **`.env.local` is gitignored:**
   - `.gitignore:34` — `.env*` pattern prevents env files from being committed.

### Recommendation
None. This category is well-implemented.

---

## b) Admin Route Protection — PARTIAL

### What works
1. **Middleware protects /admin/* routes:** `src/middleware.ts:6-8` — Only `/admin` paths are intercepted; non-admin paths pass through.
2. **Login page is allowed through:** `src/middleware.ts:12-14` — `/admin/login` and its subpaths bypass auth.
3. **Session validation via `getUser()`:** `src/middleware.ts:34-37` — Uses Supabase SSR `getUser()` which validates the JWT session cookie server-side.
4. **Unauthenticated API routes return 401 JSON:** `src/middleware.ts:42-46`.
5. **Page routes redirect to login with `next` param:** `src/middleware.ts:49-52`.

### Issues found

**Finding B-1: No admin role check — any authenticated user can access admin**  
- **Severity:** HIGH  
- **File:** `src/middleware.ts:34-40`  
- **Detail:** The middleware checks `if (user)` — meaning any authenticated Supabase user can access admin routes. There is no role check (e.g., `app_metadata.role === 'admin'`). If a user signs up through Supabase Auth without admin rights, they can still reach admin pages and API routes.  
- **Recommendation:** Add an admin role check after `getUser()`. Either check `user.app_metadata?.role === 'admin'` or maintain an `admin_users` table. The RLS `is_admin()` function in the database checks `auth.role() = 'authenticated'` which also just means "any authenticated user" — the same problem exists at the DB level.

**Finding B-2: Admin API routes have redundant but inconsistent auth checks**  
- **Severity:** LOW  
- **Files:** Multiple admin API routes (e.g., `src/app/api/admin/ghl/route.ts:47`, `src/app/api/admin/openrouter/route.ts:44`, `src/app/api/admin/voices/route.ts:21`)  
- **Detail:** Each admin API route manually calls `supabase.auth.getUser()` again, even though middleware already validates auth. This is a defense-in-depth pattern and is acceptable, but the check is still just "is authenticated" not "is admin."

**Finding B-3: Regenerate and PDF/audio routes lack auth entirely**  
- **Severity:** HIGH  
- **Files:** `src/app/api/speeches/[id]/regenerate/route.ts`, `src/app/api/speeches/[id]/pdf/route.ts`, `src/app/api/speeches/[id]/audio/route.ts`  
- **Detail:** These routes under `/api/speeches/[id]/` do NOT call `getUser()` or check auth at all. They use `createAdminClient()` directly and expose speech data (including transcript text, contact info, PDF downloads, audio streams) to any unauthenticated request that knows a speech ID.  
- **Recommendation:** Add auth checks to all `/api/speeches/[id]/*` routes, or ensure they're only accessible by authenticated admin users.

**Finding B-4: GET /api/questions is fully public**  
- **Severity:** LOW  
- **File:** `src/app/api/questions/route.ts`  
- **Detail:** Uses `createAdminClient()` but has no auth check. This is intentional per the RLS policy (public read on questions), but the API route doesn't even check for authenticated users. Acceptable if the questions are meant to be public-facing.

---

## c) RLS Policies on Supabase — PARTIAL

### What works
1. **RLS is enabled on all tables:** `001_initial_schema.sql:129-137` — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all 9 tables.
2. **Sensitive tables are admin-only:** `openrouter_integration` and `ghl_integration` have explicit "Block non-admin" SELECT policies (`001_initial_schema.sql:157-162`, `001_initial_schema.sql:206-210`).
3. **Questions are public read, admin write:** `001_initial_schema.sql:168-194` — Appropriate for public form rendering.
4. **Speeches allow public INSERT (for form submission) but admin-only SELECT/UPDATE/DELETE:** `001_initial_schema.sql:196-214`.

### Issues found

**Finding C-1: `is_admin()` function checks only for authenticated, not admin role**  
- **Severity:** HIGH  
- **File:** `001_initial_schema.sql:143-150`  
- **Detail:** The `is_admin()` function returns true for ANY authenticated user:
  ```sql
  SELECT auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
  ```
  `auth.role() = 'authenticated'` is true for every logged-in user, not just admins. This means any authenticated user can read/write all admin-only tables through the Supabase client. The "Block non-admin" policies for `openrouter_integration` and `ghl_integration` use `USING (false)` for `anon, authenticated` which does block authenticated users — but the admin policies `USING (is_admin())` would also let them through since `is_admin()` returns true for all authenticated users.  
- **Recommendation:** Add an `is_admin` column to `auth.users.app_metadata` or a separate `admin_users` table. Update `is_admin()` to check this field.

**Finding C-2: Speeches public INSERT policy has no restrictions**  
- **Severity:** MEDIUM  
- **File:** `001_initial_schema.sql:196-199`  
- **Detail:** `WITH CHECK (true)` on public insert means anyone (including anon) can insert speeches with any field values, including setting `status` to arbitrary values. The application code sets these, but a direct API call could insert a speech with `status = 'complete'` and skip the pipeline.  
- **Recommendation:** Consider restricting the INSERT policy so that only certain columns can be set by anon (e.g., force `status = 'pending'`), or add a trigger that resets status on insert.

**Finding C-3: Missing migration for GHL integration schema changes**  
- **Severity:** HIGH  
- **Files:** `001_initial_schema.sql:103-114` vs `src/app/api/admin/ghl/route.ts:88-93`  
- **Detail:** The initial migration defines `ghl_integration` with column `private_integration_token_encrypted`, but the GHL admin route (`PUT /api/admin/ghl`) writes to columns `pit_encrypted`, `pit_preview`, `is_configured`, `workflow_id`, `trigger_event`. These columns do not exist in the initial migration. Similarly, `ghl_field_mappings` in the migration has `star_data_key`/`star_data_label`/`star_data_type` columns, but the GHL route inserts `star_app_field`/`ghl_custom_field_id` and filters by `location_id`. There is no migration adding these columns. The `ghl-sync.ts` module still references the OLD column name (`private_integration_token_encrypted` at line 246), while `ghl/auth.ts` uses the NEW name (`pit_encrypted` at line 36). This will cause runtime errors.  
- **Recommendation:** Create a migration to: (1) rename `private_integration_token_encrypted` to `pit_encrypted`, (2) add `pit_preview`, `is_configured`, `workflow_id`, `trigger_event` columns to `ghl_integration`, (3) add `location_id` to `ghl_field_mappings` and rename/restructure its columns to match the API code. Then update `ghl-sync.ts` to use the new column names.

---

## d) Encrypted Credential Storage — PASS

### Evidence

1. **GHL PIT is encrypted on write:**
   - `src/app/api/admin/ghl/route.ts:70-77` — `pitEncrypted = encrypt(pit)` before storing.
   - `src/app/api/admin/ghl/route.ts:88` — stored as `pit_encrypted` in the database.

2. **OpenRouter API key is encrypted on write:**
   - `src/app/api/admin/openrouter/route.ts:76-79` — `apiKeyEncrypted = encrypt(apiKey)` before storing.
   - `src/app/api/admin/openrouter/route.ts:110` — stored as `api_key_encrypted` in the database.

3. **Decryption happens server-side only:**
   - `src/lib/openrouter.ts:55-63` — `getDecryptedApiKey()` uses `decrypt()` from `encryption.ts`, which requires `ENCRYPTION_KEY` env var (server-only).
   - `src/lib/ghl/auth.ts:47-53` — `getGhlHeaders()` decrypts PIT using `decrypt()`.
   - `src/lib/ghl-sync.ts:270` — `pit = decrypt(ghlConfig.private_integration_token_encrypted)`.

4. **Encryption implementation is sound:**
   - `src/lib/encryption.ts` uses AES-256-GCM with:
     - Fresh random IV per encryption (line 36)
     - 128-bit authentication tag (line 16)
     - Key validation (64 hex chars = 32 bytes, line 24-30)
     - Authentication tag verification on decrypt (line 71)
   - Unit test exists: `src/lib/__tests__/encryption.test.ts`

5. **Only previews are stored in plaintext:**
   - `src/app/api/admin/ghl/route.ts:85` — `pitPreview = pit.slice(-4)` (last 4 chars only)
   - `src/app/api/admin/openrouter/route.ts:88` — `apiKeyPreview = ****${apiKey.slice(-4)}` (masked)

6. **Both modules import `server-only`:**
   - `src/lib/openrouter.ts:12` and `src/lib/ghl/auth.ts:8` prevent client-side imports.

### Recommendation
None. Well-implemented.

---

## e) Idempotency Enforcement — PASS

### Evidence

1. **Idempotency key generation:**
   - `src/lib/idempotency.ts:10-20` — `generateIdempotencyKey(email, answers)` uses SHA-256 hash of sorted email + answers, producing deterministic keys.

2. **Idempotency key is used in POST /api/speeches:**
   - `src/app/api/speeches/route.ts:14-15` — Imports `generateIdempotencyKey` and `checkIdempotencyKey`.
   - `src/app/api/speeches/route.ts:49-55` — Generates key from email + answers if not provided, or uses client-provided key.
   - `src/app/api/speeches/route.ts:58-71` — Checks for existing speech with same key. If found, returns the existing speech (200) instead of creating a duplicate (201).

3. **Unique constraint in database:**
   - `001_initial_schema.sql:87` — `idempotency_key TEXT UNIQUE` on the speeches table.

4. **Client can optionally provide key:**
   - `src/app/api/speeches/route.ts:40` — `idempotencyKey: z.string().optional()` in schema.

### Recommendation
None. Well-implemented.

---

## f) Rate Limiting — NOT IMPLEMENTED

### Evidence

1. **No rate limiting middleware or library found:**
   - Searched entire codebase for `rateLimit`, `rate-limit`, `rate_limit`, `throttle`, `limiter`. Only found in Fish Audio error handling (`src/lib/fish-audio.ts:51` — rate_limit error category) and GHL API error responses (429 handling). No application-level rate limiting.

2. **Vulnerable routes:**
   - `POST /api/speeches` — Public, no auth, no rate limit. Anyone can submit unlimited speech requests, burning OpenRouter credits and Fish Audio quota.
   - `POST /api/brainstorm` — Public, no auth, no rate limit. Each request calls OpenRouter API.
   - `POST /api/auth/login` — No rate limit. Vulnerable to brute-force password attacks.
   - All admin API routes — No rate limit. Authenticated but could be abused by a compromised account.

### Recommendations
- **CRITICAL for /api/auth/login:** Add rate limiting (e.g., 5 attempts per minute per IP) to prevent brute-force attacks.
- **HIGH for /api/speeches and /api/brainstorm:** Add rate limiting (e.g., 10 requests per minute per IP) to prevent credit burn.
- Consider using a library like `rate-limiter-flexible` or Upstash Ratelimit for serverless-friendly rate limiting.

---

## g) Input Validation — PARTIAL

### What works
1. **POST /api/speeches has thorough Zod validation:**
   - `src/app/api/speeches/route.ts:8-22` — Validates contact (firstName, lastName, email, phone) and answers (questionId, answer) with Zod schemas. Email format validated. Returns structured error messages.

2. **POST /api/auth/login has Zod validation:**
   - `src/app/api/auth/login/route.ts:7-9` — Validates email format and password presence.

3. **PUT /api/admin/ghl has Zod validation:**
   - `src/app/api/admin/ghl/route.ts:14-26` — Validates pit, locationId, fieldMappings, workflowId, triggerEvent, n8nWebhookUrl (URL format), n8nEnabled.

4. **PUT /api/admin/openrouter has Zod validation:**
   - `src/app/api/admin/openrouter/route.ts:16-29` — Validates apiKey, modelId, temperature (0-2), maxTokens (positive integer).

5. **POST /api/admin/voices has Zod validation:**
   - `src/app/api/admin/voices/route.ts:41-44` — Validates fishAudioVoiceId, label, isActive.

### Issues found

**Finding G-1: POST /api/brainstorm has minimal validation**  
- **Severity:** HIGH  
- **File:** `src/app/api/brainstorm/route.ts:24-33`  
- **Detail:** Only checks `if (!questionText)`. No Zod schema. The `messages` array is not validated — could contain arbitrary content, excessive length, or injection payloads. The `currentAnswer` is not validated for length. The `questionId` field is accepted but never used.  
- **Recommendation:** Add a Zod schema limiting message count, content length, and validating questionId.

**Finding G-2: PATCH /api/admin/voices/[id] has no Zod validation**  
- **Severity:** MEDIUM  
- **File:** `src/app/api/admin/voices/[id]/route.ts:30-43`  
- **Detail:** Uses `body.json()` directly without Zod. Checks `body.isActive`, `body.label`, `body.fishAudioVoiceId` manually. No length limits on `label` or `fishAudioVoiceId`.  
- **Recommendation:** Add a Zod schema with length constraints.

**Finding G-3: POST /api/admin/prompts has minimal validation**  
- **Severity:** MEDIUM  
- **File:** `src/app/api/admin/prompts/route.ts:36-42`  
- **Detail:** Only checks `content` is a non-empty string. No max length constraint. A user could submit an extremely large prompt content.  
- **Recommendation:** Add max length constraint (e.g., 50000 chars).

**Finding G-4: No input length limits on speeches answers**  
- **Severity:** MEDIUM  
- **File:** `src/app/api/speeches/route.ts:16-17`  
- **Detail:** `answer: z.string().min(1)` has no max length. Individual answers and the answers array have no upper bound.  
- **Recommendation:** Add `.max(5000)` per answer and `.max(10)` for array length.

**Finding G-5: POST /api/speeches/[id]/regenerate has no auth and no input validation**  
- **Severity:** HIGH  
- **File:** `src/app/api/speeches/[id]/regenerate/route.ts`  
- **Detail:** No auth check. `section` parameter is cast directly without validation. No Zod schema.  
- **Recommendation:** Add auth check and validate `section` against allowed values.

---

## h) CORS and Security Headers — FAIL

### Evidence

1. **Next.js config is empty:**
   - `next.config.ts:1-5` — No headers, no CORS configuration:
     ```ts
     const nextConfig: NextConfig = { /* config options here */ };
     ```

2. **No security headers anywhere:**
   - No `X-Frame-Options` (clickjacking protection)
   - No `X-Content-Type-Options` (MIME sniffing prevention)
   - No `Content-Security-Policy` (XSS mitigation)
   - No `Referrer-Policy` (leak prevention)
   - No `Permissions-Policy` (feature restriction)
   - No `Strict-Transport-Security` (HTTPS enforcement)

3. **No CORS configuration:**
   - No explicit CORS headers set on API routes. Next.js defaults apply, which means same-origin for SSR routes and no CORS for API routes. This is acceptable for a same-origin app but should be explicitly configured.

4. **SSE routes set custom headers:**
   - `src/app/api/brainstorm/route.ts:117-120` — Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`. No CORS headers.

### Recommendations
- **HIGH:** Add security headers via `next.config.ts` headers() configuration:
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
- **MEDIUM:** Add `Content-Security-Policy` appropriate for the application.
- **MEDIUM:** Add `Strict-Transport-Security` if the app is served over HTTPS.
- **LOW:** Explicitly define CORS policy for API routes.

---

## Additional Findings

**Finding X-1: Schema column name mismatches cause runtime errors**  
- **Severity:** CRITICAL  
- **Detail:** Multiple discrepancies between the database schema (migrations) and the application code:
  
  | Table | Migration Column | Code Writes To | Files |
  |-------|-----------------|----------------|-------|
  | `speeches` | `user_first_name` | `first_name` | `src/app/api/speeches/route.ts:79` |
  | `speeches` | `user_last_name` | (not set, but `first_name` implies `last_name`) | — |
  | `speeches` | `user_email` | `email` | Inferred from pattern |
  | `speeches` | `user_phone` | `phone` | Inferred from pattern |
  | `ghl_integration` | `private_integration_token_encrypted` | `pit_encrypted` | `src/app/api/admin/ghl/route.ts:88` |
  | `ghl_integration` | (missing) | `pit_preview` | `src/app/api/admin/ghl/route.ts:89` |
  | `ghl_integration` | (missing) | `is_configured` | `src/app/api/admin/ghl/route.ts:91` |
  | `ghl_integration` | `email_workflow_id` | `workflow_id` | `src/app/api/admin/ghl/route.ts:92` |
  | `ghl_integration` | (missing) | `trigger_event` | `src/app/api/admin/ghl/route.ts:93` |
  | `ghl_field_mappings` | `star_data_key` | `star_app_field` | `src/app/api/admin/ghl/route.ts:143` |
  | `ghl_field_mappings` | `star_data_label`/`star_data_type` | (not set) | — |
  | `ghl_field_mappings` | (missing) | `location_id` | `src/app/api/admin/ghl/route.ts:131` |

  Additionally, `ghl-sync.ts` still references the OLD column name `private_integration_token_encrypted` (line 246), while `ghl/auth.ts` uses the NEW name `pit_encrypted` (line 36). These are inconsistent and one will fail at runtime.

- **Recommendation:** Create migration(s) to align the database schema with the application code. Decide on canonical column names and update both the code and schema to match. This is blocking for GHL integration and speech creation.

**Finding X-2: .env.local contains real secrets**  
- **Severity:** LOW (gitignored, but noted for ops)  
- **Detail:** `.env.local` contains `SUPABASE_SERVICE_ROLE_KEY`, `FISH_AUDIO_API_KEY`, `ENCRYPTION_KEY`, `ADMIN_EMAIL`, and `ADMIN_INITIAL_PASSWORD`. These are correctly gitignored but should be rotated if the repo is ever made public.  
- **Recommendation:** Use a secrets manager for production. Document key rotation procedures.

---

## Build Verification

```
npm run build — PASS
```

Build completes successfully with no errors. All routes compile correctly.

---

## Summary Table

| # | Category | Status | Critical | High | Medium | Low |
|---|----------|--------|----------|------|--------|-----|
| a | Secrets in client bundle | PASS | 0 | 0 | 0 | 0 |
| b | Admin route protection | PARTIAL | 0 | 2 | 0 | 2 |
| c | RLS policies | PARTIAL | 0 | 2 | 1 | 0 |
| d | Encrypted credential storage | PASS | 0 | 0 | 0 | 0 |
| e | Idempotency enforcement | PASS | 0 | 0 | 0 | 0 |
| f | Rate limiting | NOT IMPLEMENTED | 0 | 0 | 2 | 0 |
| g | Input validation | PARTIAL | 0 | 2 | 2 | 0 |
| h | CORS and headers | FAIL | 0 | 1 | 2 | 1 |
| X | Additional (schema mismatch) | — | 1 | 0 | 0 | 1 |
| | **TOTALS** | | **1** | **7** | **7** | **4** |