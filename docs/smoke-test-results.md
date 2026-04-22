# Post-Deploy Smoke Test Results

**Date:** April 22, 2026 03:20 EDT  
**Agent:** W6-04  
**Primary URL:** https://star-app-weld.vercel.app  
**Backup URL:** https://star-86fmqrl73-blackceo.vercel.app  

---

## Test Results Summary

| # | Test | Expected | Actual | Result |
|---|------|----------|--------|--------|
| 1 | GET /api/questions | 200 | 500 | **FAIL** |
| 2 | GET / | 200 | 200 | **PASS** |
| 3 | GET /admin | 302/307 | 500 | **FAIL** |
| 4 | GET /admin/login | 200 | 200 | **PASS** |
| 5 | POST /api/auth/login (wrong creds) | 401 | 500 | **FAIL** |
| 6 | GET /api/speeches | 401 | 405 | **FAIL** |
| 7 | Security headers | Present | Present | **PASS** |
| 8 | Rate limit (6th attempt → 429) | 429 on 6th | 429 on 6th | **PASS** |
| 9 | GET /api/questions content | Array of question objects | 500 error, no data | **FAIL** |
| 10 | Build info (Vercel/Next.js headers) | Present | Present | **PASS** |

**Pass: 4 / Fail: 6**

---

## Detailed Findings

### Test 1: GET /api/questions — FAIL
- **Expected:** 200 with JSON array of questions
- **Actual:** HTTP 500 — `{"error":"Internal server error"}`
- **Response headers:** Content-Type: application/json, X-Matched-Path: /api/questions, Vercel cache: MISS
- **Note:** API route exists and is matched by Vercel, but throws a 500 internal server error. Likely a database connection or environment variable issue in production.

### Test 2: GET / (Landing Page) — PASS
- **Expected:** 200
- **Actual:** HTTP 200
- **Response headers:** Content-Type: text/html; charset=utf-8, X-NextJS-Prerender: 1, X-Vercel-Cache: HIT
- **Note:** Landing page renders correctly via Next.js SSR/static generation.

### Test 3: GET /admin — FAIL
- **Expected:** 302/307 redirect to /admin/login
- **Actual:** HTTP 500
- **Error header:** `X-Vercel-Error: MIDDLEWARE_INVOCATION_FAILED`
- **Note:** The redirect middleware is crashing in production. This prevents admin access entirely. The middleware function likely has a runtime error or missing environment variable.

### Test 4: GET /admin/login — PASS
- **Expected:** 200
- **Actual:** HTTP 200
- **Note:** Login page renders correctly when accessed directly (bypassing the broken middleware redirect).

### Test 5: POST /api/auth/login (Wrong Credentials) — FAIL
- **Expected:** 401 Unauthorized
- **Actual:** HTTP 500 — `{"error":"Internal server error"}`
- **Note:** The auth login route crashes instead of returning a proper 401. Same pattern as other API routes — the route is matched but the handler throws an unhandled error.

### Test 6: GET /api/speeches (Unauthenticated) — FAIL
- **Expected:** 401 Unauthorized
- **Actual:** HTTP 405 Method Not Allowed
- **Note:** The route exists (X-Matched-Path: /api/speeches) but only responds to methods other than GET, or the method check happens before auth. A 405 is semantically different from 401 — the endpoint rejects GET entirely rather than requiring auth.

### Test 7: Security Headers — PASS
All expected security headers are present:
- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` ✅
- Additional: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` ✅

### Test 8: Rate Limiting — PASS
- **Attempts 1-5:** All returned 500 (auth route crashing)
- **Attempt 6:** Returned 429 (Too Many Requests) ✅
- **Note:** Rate limiting is working correctly — the 6th rapid request is blocked. The 500s are from the underlying route crash, not a rate limit issue.

### Test 9: GET /api/questions Content — FAIL
- **Expected:** JSON array with question objects containing `question_text` and other fields
- **Actual:** HTTP 500 error response — could not parse question data
- **Note:** The API is completely non-functional for data retrieval. No questions are accessible.

### Test 10: Build Info — PASS
Next.js and Vercel headers confirmed:
- `Server: Vercel` ✅
- `X-NextJS-Prerender: 1` ✅
- `X-NextJS-Stale-Time: 300` ✅
- `X-Vercel-Cache: HIT` ✅
- `X-Vercel-Enable-Rewrite-Caching: 1` ✅
- `X-Vercel-ID` present ✅

---

## Root Cause Analysis

The primary issue across all failing tests is **API route handlers and middleware crashing with 500 errors**. Common patterns:

1. **Middleware failure** (`/admin` → MIDDLEWARE_INVOCATION_FAILED): The Next.js middleware has a runtime error, likely missing environment variables or a broken import.

2. **API route 500s** (`/api/questions`, `/api/auth/login`): All API routes that touch the database or auth logic crash. This strongly suggests:
   - Missing or misconfigured environment variables (database URL, auth secrets) in Vercel production environment
   - Database connection issues in production
   
3. **Method mismatch** (`/api/speeches` → 405): The speeches endpoint may only accept POST, or the route handler doesn't properly handle GET requests.

**Static pages work** (landing page, login page) because they don't depend on runtime API logic.

---

## Overall Assessment: NOT READY for Production Use

**6 out of 10 tests FAIL.** The application is not production-ready in its current state.

### Critical Issues (Must Fix Before Launch):
1. **All API routes return 500** — The backend is completely non-functional. No data can be fetched, no authentication works.
2. **Middleware crashes** — Admin route redirects fail, blocking admin access.
3. **Missing environment variables** — Most likely root cause. Verify all required env vars are set in Vercel project settings.

### Working:
- ✅ Static page rendering (landing page, login page)
- ✅ Security headers properly configured
- ✅ Rate limiting functional
- ✅ Vercel deployment and Next.js build pipeline

### Recommended Next Steps:
1. Check Vercel project environment variables — ensure DATABASE_URL, NEXTAUTH_SECRET, and any other required env vars are set
2. Review Vercel function logs for detailed error messages: `vercel logs https://star-app-weld.vercel.app`
3. Fix middleware.ts — check for undefined variable access or missing env vars
4. Redeploy after fixing env vars and verify API routes return 200/401 as expected
5. Re-run this smoke test after fixes