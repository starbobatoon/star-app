# STAR App - Deployment Documentation

## Production Deployment

- **Production URL:** https://star-86fmqrl73-blackceo.vercel.app
- **Alias URL:** https://star-app-weld.vercel.app
- **Vercel Project:** blackceo/star-app
- **Deploy Timestamp:** 2026-04-22 03:18 EDT
- **Commit Hash:** db3b61ad2fcaebca87447d65617fc5246cbc8238
- **Commit Message:** W6-FIX: Critical security fixes - schema alignment, admin auth, rate limiting, input validation, security headers
- **Vercel CLI Version (Local):** 50.4.9
- **Vercel CLI Version (Build):** 51.6.1
- **Next.js Version:** 16.2.4
- **Build Region:** Washington, D.C., USA (iad1)
- **Build Duration:** ~24s
- **Deploy Duration:** ~40s

## Build Notes

- Build completed successfully with no errors
- 26 static pages generated
- Middleware convention warning (deprecated in Next.js 16.x, should migrate to "proxy" convention)
- All routes deployed correctly

## Environment Variables

The following environment variables are required for the app to function fully at runtime:

- `NEXTAUTH_SECRET` - Required for NextAuth.js authentication
- `NEXTAUTH_URL` - Should be set to the production URL
- `OPENROUTER_API_KEY` - Required for AI speech generation features
- `ADMIN_PASSWORD` - Required for admin panel access

> **Note:** These env vars should be configured in the Vercel dashboard under Project Settings > Environment Variables. They were NOT added to the repository for security reasons.

## Deployment History

| Date | Action | By |
|------|--------|-----|
| 2026-04-22 | Initial production deployment | W6-03 |