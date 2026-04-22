# HANDOFF — Star App Logo Fix

**Date:** April 22, 2026
**Commit:** `f7bad7a`
**Branch:** main

## Root Cause

The logo image file (`/logo.png`) existed in `public/` and was correctly used on 3 surfaces (admin sidebar, admin login, user login). However, 4 other branded surfaces used plain text `<span>STAR SPEAKER AI</span>` instead of the actual `<img>` tag. This caused the logo to appear inconsistently — visible on some pages, missing (text-only) on others.

## Files Changed

| File | Change |
|------|--------|
| `src/app/page.tsx` | Replaced text span with `<img src="/logo.png">` in landing page header |
| `src/app/compose/page.tsx` | Replaced text link with `<img>` in ComposeNav header |
| `src/app/admin/(dashboard)/layout.tsx` | Replaced text span with `<img>` in mobile header |
| `src/app/speech/[id]/page.tsx` | Added branded header with logo + Home link (had no header at all) |

## Verification

- TypeScript compilation passed (`next build` compiled successfully)
- Build runtime failure is expected (missing Supabase env vars in local clone, unrelated to logo)

## Deployment Status

**Deployment still needed.** The commit has been pushed to `origin/main` but a deployment (Vercel, Docker, or wherever Star app is hosted) has not been triggered yet.
