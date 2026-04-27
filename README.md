# STAR Speaker AI

**5-Minute Speeches, Powered by Star Bobatoon's Methodology**

STAR Speaker AI is a Next.js web application that generates compelling 5-minute speeches using Star Bobatoon's proprietary speechwriting methodology and produces professional audio via Fish Audio text-to-speech.

## Overview

- **Method-Driven Writing** — Speeches are crafted using Star Bobatoon's structured MAP → Hook → Story → Point → CTA → Exit framework
- **AI Speech Generation** — Powered by OpenRouter (supports Claude, GPT, Gemini, and more)
- **Audio Generation** — Written speeches are converted to natural-sounding audio via Fish Audio TTS
- **CRM Integration** — Automatically syncs contacts and delivers audio to GoHighLevel
- **Admin Dashboard** — Full-featured admin panel for managing voices, questions, users, and analytics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (`speech-audio` bucket) |
| AI / LLM | OpenRouter API |
| TTS | Fish Audio API |
| CRM | GoHighLevel (GHL) |
| Hosting | Vercel |

## Getting Started

```bash
npm install
npm run dev
```

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=
```

## Project Structure

```
src/
  app/
    admin/          # Admin dashboard (stats, voices, users, questions, analytics)
    api/            # API routes (speeches, admin, auth)
    compose/        # Public speech submission form
  lib/
    audio-generator.ts   # Fish Audio TTS pipeline
    pipeline.ts          # Full speech generation pipeline
    speech-generator.ts  # OpenRouter LLM generation
    ghl-sync.ts          # GoHighLevel CRM sync
supabase/
  migrations/       # Database schema migrations (001–010)
```

## Audio Pipeline

1. User submits speech form → `POST /api/speeches` stamps active voice on record
2. Pipeline runs: LLM generates text → Fish Audio generates MP3 → uploaded to `speech-audio` bucket
3. `audio_storage_path` and `audio_ghl_url` saved on speech record
4. Contact synced to GHL, audio delivered via workflow trigger

## Admin Dashboard

Access at `/admin`. Features:
- **Overview** — Live stats, recent speeches, Play/Download/Regenerate actions
- **Model Settings** — OpenRouter API key, model slot configuration, custom prompts
- **Voice Config** — Fish Audio voices, preview, set active voice
- **Users** — Admin user management
- **Questions** — Compose page questionnaire editor
- **GHL Integration** — GoHighLevel credentials, field mapping, workflow config
- **Analytics** — Speech counts, success rates, activity feed

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

## License

Private repository. All rights reserved.
