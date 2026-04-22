# Post-Speech Delivery Gap Analysis

## Files Touched by Delivery/Notifications

| File | Role |
|------|------|
| `src/lib/pipeline.ts` | Orchestrator: runs Stage 4 `notifyOnCompletion()` after GHL sync |
| `src/lib/notify.ts` | Core delivery logic: dispatches email via GHL workflow + SMS via n8n webhook |
| `src/lib/ghl-sync.ts` | Stage 3: upserts contact, sets custom fields, triggers GHL workflow, calls n8n |
| `src/lib/ghl/workflows.ts` | `triggerWorkflow()` — POST to GHL `/workflows/{id}/subscriptions` |
| `src/lib/ghl/contacts.ts` | `upsertByEmail()` — search/create/update GHL contact |
| `src/lib/ghl/media.ts` | `uploadMedia()` — uploads files to GHL media library (PDF/audio) |
| `src/lib/ghl/auth.ts` | PIT decrypt + header construction |
| `src/lib/audio-generator.ts` | **STUB** — returns `{ success: true }` with no real TTS |
| `src/app/api/speeches/[id]/delivery/route.ts` | GET delivery status + POST re-trigger (admin only) |
| `src/app/api/speeches/[id]/status/route.ts` | Public polling endpoint for compose page |
| `src/app/api/speeches/route.ts` | POST creates speech + fire-and-forget pipeline |
| `src/app/api/speeches/[id]/generate/route.ts` | Admin-triggered pipeline re-run |
| `src/app/compose/page.tsx` | StandBy screen — promises "we'll email and text you" |
| `src/app/speech/[id]/page.tsx` | Preview page — shows transcript + audio, no delivery status |
| `supabase/migrations/006_delivery_status.sql` | Adds `delivery_status` JSONB column to `speeches` |

---

## Gap 1: Audio Generator Is a Stub — Pipeline Completes Without Real Audio

**Severity: Critical**

`src/lib/audio-generator.ts` is a placeholder:

```ts
export async function generateSpeechAudio(
  _speechId: string
): Promise<GenerateResult> {
  console.log(`[audio-generator] Stub called for ${_speechId}`);
  return { success: true };
}
```

**Impact:** The pipeline reaches Stage 4 (delivery notification) with no audio file. Any email/SMS will link to a page that has no audio URL. Fish Audio TTS is referenced in the architecture but never called.

**Required:** Real Fish Audio TTS integration that:
- Reads speech transcript from DB
- Calls Fish Audio API with configured voice
- Stores audio file in Supabase Storage (`speech-audio` bucket)
- Writes `audio_url` and `audio_storage_path` on the speech record

---

## Gap 2: No GHL Workflow Trigger for SMS — Only Email

**Severity: High**

The GHL workflow trigger in `ghl-sync.ts` Stage 7 only fires for email. The `notify.ts` SMS path depends entirely on n8n:

```ts
// notify.ts — SMS section
if (config.n8n_enabled && config.n8n_webhook_url && speech.phone) {
  // ...dispatchToN8n
} else {
  console.log(`[notify] No SMS channel configured`);
}
```

**What's missing:**
- No GHL SMS action/smart list trigger configured
- No SMS-specific workflow ID field in `ghl_integration` table — only `email_workflow_id`
- The admin GHL integration page (`ghl-integration/page.tsx`) has no SMS workflow section
- The compose page promises "we'll text you" but the only SMS path (n8n) is optional and disabled by default

**Required:**
- Add `sms_workflow_id` column to `ghl_integration`
- Add SMS workflow section to admin UI
- Or: implement n8n SMS as the primary path with a Twilio/Telnyx provider

---

## Gap 3: GHL Workflow Fires Twice — Once in ghl-sync, Once in notify

**Severity: Medium**

`pipeline.ts` calls both `syncSpeechToGHL()` and `notifyOnCompletion()`. The GHL workflow is triggered in Stage 3 (`ghl-sync.ts` line ~240):

```ts
// ghl-sync.ts Stage 7
if (ghlConfig.email_workflow_id) {
  await triggerWorkflow({ contactId, workflowId: ghlConfig.email_workflow_id });
}
```

Then `notify.ts` marks email as successful because of that workflow:

```ts
// notify.ts
if (config.email_workflow_id && config.pit_encrypted) {
  status.email.attempted = true;
  status.email.method = "ghl_workflow";
  status.email.success = true; // <-- assumes ghl-sync already sent it
}
```

**The problem:** `notify.ts` never actually fires the GHL workflow itself — it just assumes `ghl-sync.ts` did. If `ghl-sync.ts` skipped the workflow (e.g., error caught), `notify.ts` still reports `success: true`. The workflow trigger and the delivery status recording are split across two modules with no coordination.

**Required:** Consolidate workflow trigger into `notify.ts` as the single source of truth, or add a return value from `syncSpeechToGHL()` indicating whether the workflow actually fired.

---

## Gap 4: n8n Webhook Called Twice With Different Payloads

**Severity: Medium**

n8n is called in two places with different event names and payloads:

**In `ghl-sync.ts` Stage 8:**
```ts
// Event: "speech_complete"
const payload = {
  event: "speech_complete",
  speechId: speech.id,
  contactId, email, firstName, lastName,
  hook, story, point, cta, exit,
  wordCount, pdfUrl, audioUrl, completedAt,
};
```

**In `notify.ts` via `dispatchToN8n()`:**
```ts
// Event: "speech_delivery"
const payload = {
  event: "speech_delivery",
  channel, // "email" | "sms"
  speechId, contact: { firstName, lastName, email, phone, ghlContactId },
  speechUrl, completedAt,
};
```

**The problem:** If both n8n paths are enabled, n8n receives 3 webhook calls per speech (1 from ghl-sync + 2 from notify email+sms). The payloads have different schemas. n8n would need separate workflow branches to handle each.

**Required:** Single n8n webhook call with a unified payload that includes channel preferences and speech URL.

---

## Gap 5: No Delivery Status Shown in UI

**Severity: High**

The compose page StandBy screen promises delivery:

```tsx
// compose/page.tsx
<p>we'll also send this to you by email at <strong>{email}</strong> and text you when it's ready.</p>
```

But after the speech is shown, there is:
- No delivery status indicator (email sent / SMS sent / failed)
- No checkmark or badge confirming delivery
- The `delivery_status` JSONB column exists (migration 006) but is never read by any frontend component
- The `/api/speeches/[id]/delivery` GET endpoint exists but no page calls it

**Required:** Add delivery status display to the speech preview page (`speech/[id]/page.tsx`) polling the delivery endpoint after speech completion.

---

## Gap 6: No Retry / Error Recovery for Failed Deliveries

**Severity: High**

When delivery fails, the system:
- Logs the error to console
- Records `success: false` in `delivery_status` JSONB
- Writes an audit log entry

But there is:
- No automatic retry mechanism
- No admin alert/notification for delivery failures
- No dashboard view showing delivery success/failure rates
- The admin re-trigger endpoint (`POST /api/speeches/[id]/delivery`) exists but has no visibility into what failed or why

**Required:**
- Admin delivery dashboard or analytics section showing failure rates
- Automatic retry with exponential backoff for n8n webhook failures
- Alert mechanism (Slack/email to admin) when delivery fails

---

## Gap 7: pipeline.ts Sets status="complete" AFTER notify — Race Condition

**Severity: Low**

In `pipeline.ts`, the status is updated to "complete" after Stage 4:

```ts
// After all 4 stages including delivery notification
const { error: updateError } = await admin
  .from("speeches")
  .update({ status: "complete", completed_at: completedAt })
  .eq("id", speechId);
```

But `ghl-sync.ts` also sets status to "complete" at the end of Stage 3:

```ts
// ghl-sync.ts
await updateSpeechStatus(adminClient, speechId, "complete");
```

**The problem:** Status goes `syncing_ghl` -> `complete` (by ghl-sync) -> `complete` (again by pipeline). The compose page polling detects `complete` and shows the speech while delivery notification is still in-flight. Minor but creates a window where the user sees their speech before the email/SMS confirmation is recorded.

**Required:** Either add an intermediate `delivering` status, or move status update to after delivery completes.

---

## Gap 8: Missing Column Name Mismatch — `first_name` vs `user_first_name`

**Severity: Fixed (migration 004)**

The initial schema (001) used `user_first_name`, `user_last_name`, `user_email`, `user_phone` but migration 004 renamed them to `first_name`, `last_name`, `email`, `phone`. The `notify.ts` file correctly reads `first_name`, `last_name`, `email`, `phone`. This is resolved if migrations 001 + 004 are both applied.

**Status:** Resolved by migration 004, but worth noting if anyone references the old column names.

---

## Summary — Priority Order

| # | Gap | Severity | Effort |
|---|-----|----------|--------|
| 1 | Audio generator is a stub | Critical | Large (new Fish Audio integration) |
| 2 | No SMS delivery channel configured | High | Medium (add SMS workflow + n8n) |
| 5 | No delivery status shown in UI | High | Small (read delivery_status in preview page) |
| 6 | No retry or error recovery | High | Medium (retry logic + admin dashboard) |
| 3 | GHL workflow fires twice / uncoordinated | Medium | Small (consolidate trigger location) |
| 4 | n8n webhook called twice with different payloads | Medium | Small (unify payload) |
| 7 | Status race condition during delivery | Low | Small (add `delivering` status) |
| 8 | Column name mismatch | Fixed | N/A |
