# Delivery Workflow Design Document

**Task:** 2/5 - Post-completion delivery workflow design
**Date:** 2026-04-22
**Repo:** /tmp/star-app-post-delivery-v2

---

## Executive Summary

The delivery workflow triggers after a speech pipeline completes (audio + PDF ready). It delivers the speech to the user through two channels:

1. **Primary:** GoHighLevel (GHL) — upsert contact, set custom fields (media URLs, speech metadata), trigger email workflow
2. **Fallback:** n8n webhook — SMS and/or email delivery when GHL workflow is unavailable

Delivery status is tracked per-channel in a JSONB column on the speeches table. A dedicated API endpoint allows admins to check status or re-trigger delivery.

**Key finding:** ~90% of this system is already implemented. This document describes the existing architecture and proposes targeted enhancements.

---

## Current Architecture

### Pipeline Flow

```
POST /api/speeches (public form submission)
  |
  v
runSpeechPipeline(speechId)  [lib/pipeline.ts]
  |
  |-- Stage 1: generateSpeechText()     → transcript + sections
  |-- Stage 2: generateSpeechAudio()    → Fish Audio TTS → audio file
  |-- Stage 3: syncSpeechToGHL()        → contact + fields + workflow + n8n  [lib/ghl-sync.ts]
  |-- Stage 4: notifyOnCompletion()     → delivery status tracking           [lib/notify.ts]
  |
  v
status = "complete", completed_at set
```

### What Already Exists

| Component | File | Status |
|---|---|---|
| DB column `delivery_status` | migration `006_delivery_status.sql` | Exists |
| GHL contact upsert | `src/lib/ghl/contacts.ts` | Exists |
| GHL custom fields | `src/lib/ghl/customFields.ts` | Exists |
| GHL workflow trigger | `src/lib/ghl/workflows.ts` | Exists |
| GHL media upload | `src/lib/ghl/media.ts` | Exists |
| GHL sync orchestrator | `src/lib/ghl-sync.ts` | Exists |
| Notify lib (email + SMS) | `src/lib/notify.ts` | Exists |
| Delivery GET + POST | `src/app/api/speeches/[id]/delivery/route.ts` | Exists |
| Pipeline orchestrator | `src/lib/pipeline.ts` | Exists |

---

## Database Schema

### Existing Column (Migration 006)

```sql
-- Already applied:
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS delivery_status JSONB DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_speeches_delivery_status
  ON speeches USING gin (delivery_status);
```

### Current `delivery_status` Shape

```json
{
  "email": {
    "attempted": true,
    "method": "ghl_workflow" | "n8n_webhook",
    "success": true,
    "error": "optional error string"
  },
  "sms": {
    "attempted": true,
    "method": "n8n_webhook",
    "success": false,
    "error": "optional error string"
  }
}
```

### Proposed Enhancement: New Migration 009

Add delivery-level tracking columns for better observability:

```sql
-- 009_delivery_enhancements.sql

-- Timestamp of last delivery attempt (separate from completed_at)
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

-- Count of delivery attempts (for re-trigger tracking)
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS delivery_attempt_count INT DEFAULT 0;

-- GHL workflow trigger result (separate from overall delivery_status)
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS ghl_workflow_triggered BOOLEAN DEFAULT false;

-- n8n webhook call result
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS n8n_webhook_called BOOLEAN DEFAULT false;

-- Index for querying undelivered completed speeches
CREATE INDEX IF NOT EXISTS idx_speeches_pending_delivery
  ON speeches (status, delivered_at)
  WHERE status = 'complete' AND delivered_at IS NULL;
```

### Why These Columns

- `delivered_at` — separates "speech generated" from "speech delivered" for analytics
- `delivery_attempt_count` — prevents infinite re-trigger loops
- `ghl_workflow_triggered` / `n8n_webhook_called` — quick boolean checks without parsing JSONB
- Partial index — fast query for "completed but never delivered" (useful for retry jobs)

---

## API Endpoint Spec

### Existing: `POST /api/speeches/[id]/delivery`

Already implemented at `src/app/api/speeches/[id]/delivery/route.ts`.

**GET** — Returns delivery status for a speech.

```
GET /api/speeches/[id]/delivery
Auth: Required (user owns speech OR admin)
Response 200:
{
  "id": "uuid",
  "status": "complete",
  "completedAt": "ISO timestamp",
  "delivery": {
    "email": { "attempted": true, "method": "ghl_workflow", "success": true },
    "sms": { "attempted": false, "success": false, "note": "..." }
  }
}
```

**POST** — Re-triggers delivery notification (admin-only).

```
POST /api/speeches/[id]/delivery
Auth: Admin only
Response 200:
{
  "success": true,
  "delivery": { "email": {...}, "sms": {...} }
}
Response 409: Speech not complete
Response 429: Already triggered within last hour
```

### Proposed: Rename to `/api/speeches/[id]/deliver`

The task specifies `/api/speeches/[id]/deliver`. Two options:

**Option A (recommended):** Keep existing `/delivery` route. It is already functional with GET + POST, admin auth, duplicate guards, and delivery status tracking. Rename is cosmetic-only and breaks any existing integrations.

**Option B:** Create `/api/speeches/[id]/deliver` as a new POST-only endpoint with identical logic, and deprecate `/delivery`. Adds code duplication.

**Recommendation:** Keep `/delivery`. If the exact path `/deliver` is required, rename the directory and update any internal references.

---

## Delivery Flow (Pseudocode)

### Phase 1: GHL Sync (in `ghl-sync.ts`, Stage 3 of pipeline)

```
function syncSpeechToGHL(speechId):
  config ← read ghl_integration from DB
  if config is missing or no PIT:
    skip gracefully → mark speech complete

  pit ← decrypt(config.pit_encrypted)
  speech ← read speeches[id=speechId]
  mappings ← read ghl_field_mappings where ghl_custom_field_id IS NOT NULL

  // Step 1: Upsert contact
  existing ← GHL.searchContactByEmail(speech.email)
  if existing:
    GHL.updateContact(existing.id, {firstName, lastName, phone})
    contactId ← existing.id
  else:
    contactId ← GHL.createContact({email, firstName, lastName, phone})
  save ghl_contact_id to speech record

  // Step 2: Set custom fields
  fieldValues ← buildSpeechFieldValues(speech)  // maps audio_url, pdf_url, sections, etc.
  customFields ← map fieldValues through ghl_field_mappings
  GHL.patchContact(contactId, { customFields })

  // Step 3: Trigger email workflow
  if config.email_workflow_id:
    GHL.triggerWorkflow(contactId, config.email_workflow_id)

  // Step 4: n8n webhook (fallback)
  if config.n8n_enabled and config.n8n_webhook_url:
    POST to n8n webhook with speech data + contact info
```

### Phase 2: Delivery Notification (in `notify.ts`, Stage 4 of pipeline)

```
function notifyOnCompletion(speechId):
  config ← read ghl_integration from DB
  speech ← read speeches[id=speechId]

  status ← { email: {attempted:false, success:false}, sms: {attempted:false, success:false} }

  // Email delivery
  if config.email_workflow_id:
    status.email ← { attempted: true, method: "ghl_workflow", success: true }
    // (workflow was already triggered in ghl-sync.ts Stage 7)
  else if config.n8n_enabled and config.n8n_webhook_url:
    POST to n8n webhook with channel="email"
    status.email ← { attempted: true, method: "n8n_webhook", success: true }

  // SMS delivery
  if config.n8n_enabled and config.n8n_webhook_url and speech.phone:
    POST to n8n webhook with channel="sms"
    status.sms ← { attempted: true, method: "n8n_webhook", success: true }

  // Persist
  UPDATE speeches SET delivery_status = status WHERE id = speechId
  audit_log("delivery_notification", speechId, status)

  return status
```

### Phase 3: Re-trigger (in `delivery/route.ts`)

```
POST /api/speeches/[id]/delivery (admin-only):
  speech ← read speeches[id=speechId]
  assert speech.status is "complete"

  existingDelivery ← speech.delivery_status
  if existingDelivery was successful within last hour:
    return 429 "already triggered"

  result ← notifyOnCompletion(speechId)
  return { success: true, delivery: result }
```

---

## GHL Custom Field Mapping

The `ghl_field_mappings` table maps STAR App data keys to GHL custom field IDs. The `buildSpeechFieldValues()` function in `ghl-sync.ts` constructs the values:

| STAR App Key | Source | Example Value |
|---|---|---|
| `audio_url` | `speech.audio_ghl_url` | `https://...ghl.../audio.mp3` |
| `pdf_url` | `speech.pdf_ghl_url` | `https://...ghl.../speech.pdf` |
| `word_count` | `speech.word_count` | `"245"` |
| `voice_used` | `speech.voice_used` | `"Stefan"` |
| `speech_id` | `speech.id` | `"uuid"` |
| `generation_status` | `speech.status` | `"complete"` |
| `q1_message` through `q10_context` | `speech.answers` JSONB | User's answer text |
| `q7_hook` | `speech.hook` | Generated hook text |
| `q4_story` | `speech.story` | Generated story text |
| `q5_lesson` | `speech.point` | Generated point text |
| `q8_cta` | `speech.cta` | Generated CTA text |
| `q9_exit` | `speech.exit` | Generated exit text |
| `generated_at` | `now()` | ISO timestamp |

---

## n8n Webhook Payload

Two distinct events are sent to n8n:

### Event 1: `speech_complete` (from `ghl-sync.ts`)

```json
{
  "event": "speech_complete",
  "speechId": "uuid",
  "contactId": "ghl_contact_id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "hook": "generated hook text...",
  "story": "generated story text...",
  "point": "generated point text...",
  "cta": "generated CTA text...",
  "exit": "generated exit text...",
  "wordCount": 245,
  "pdfUrl": "https://...",
  "audioUrl": "https://...",
  "completedAt": "ISO timestamp"
}
```

### Event 2: `speech_delivery` (from `notify.ts`)

```json
{
  "event": "speech_delivery",
  "channel": "email" | "sms",
  "speechId": "uuid",
  "contact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "phone": "+1234567890",
    "ghlContactId": "ghl_contact_id"
  },
  "speechUrl": "https://app.starspeaker.com/speech/uuid",
  "completedAt": "ISO timestamp"
}
```

---

## Error Handling

### Fatal vs Non-Fatal

| Stage | Failure Behavior |
|---|---|
| Text generation | **Fatal** — pipeline stops, speech marked `failed` |
| Audio generation | **Fatal** — pipeline stops, speech marked `failed` |
| GHL contact upsert | **Non-fatal** — speech marked `complete`, delivery skipped |
| GHL custom fields | **Non-fatal** — contact exists, fields missing, continues |
| GHL workflow trigger | **Non-fatal** — logged, continues |
| n8n webhook | **Non-fatal** — logged, continues |
| Delivery notification | **Non-fatal** — speech already `complete`, notification is best-effort |

### Retry Strategy

- Pipeline stages 1-2: No automatic retry (user can resubmit)
- Stage 3 (GHL sync): Non-fatal failures skip to `complete` status
- Stage 4 (notify): Non-fatal, delivery_status records what happened
- Manual re-trigger: Admin POST to `/api/speeches/[id]/delivery` (1-hour dedup guard)

---

## Security

- **GET /delivery:** Auth required. User can view own speech delivery status; admin can view any.
- **POST /delivery:** Admin only. Checked via `isAdmin(user)` which validates `app_metadata.role === 'admin'` or `ADMIN_EMAIL` env match.
- **GHL PIT:** Encrypted at rest using AES-256-GCM (`src/lib/encryption.ts`). Decrypted only server-side.
- **n8n webhook URL:** Stored in `ghl_integration` table, admin-only access via RLS.
- **Rate limit:** Re-trigger endpoint has 1-hour dedup guard to prevent abuse.

---

## What Needs Building (Gaps)

### 1. Migration 009 (optional enhancement)
The `delivery_status` JSONB column exists. The proposed columns (`delivered_at`, `delivery_attempt_count`, etc.) are optional enhancements for observability. Not required for the delivery workflow to function.

### 2. Audio generator is a stub
`src/lib/audio-generator.ts` returns `{ success: true }` without generating audio. The actual Fish Audio TTS integration is marked TODO(W4-04). Until this is implemented, `audio_ghl_url` will be null in GHL custom fields.

### 3. PDF upload to GHL
The PDF generator (`src/lib/pdf-generator.tsx`) creates PDFs. The GHL media upload (`src/lib/ghl/media.ts`) exists. The pipeline needs a step between audio generation and GHL sync that:
- Generates the PDF buffer
- Uploads to GHL media library
- Stores the returned URL in `pdf_ghl_url`
- Same for audio: upload to GHL, store in `audio_ghl_url`

This upload step is referenced in the pipeline flow but not yet wired into `runSpeechPipeline()`.

### 4. GHL field mappings seed data
The `ghl_field_mappings` table needs seed rows for the keys used in `buildSpeechFieldValues()`. Without mappings, custom fields are not written to GHL contacts. Seed data should be in migration 002 or a new migration.

---

## Summary

The delivery system is architecturally complete. The core pieces (DB schema, GHL integration, n8n fallback, notify lib, delivery API endpoint) all exist and are wired together in the pipeline. The main gaps are:

1. **Audio generator stub** — needs real Fish Audio TTS implementation
2. **Media upload wiring** — PDF and audio need to be uploaded to GHL before the sync step
3. **Field mapping seed data** — `ghl_field_mappings` needs rows for the data keys
4. **Optional DB enhancements** — `delivered_at`, attempt counter columns for observability

No new tables, no new API routes, no new lib modules are required. The work is integration and completion, not architecture.
