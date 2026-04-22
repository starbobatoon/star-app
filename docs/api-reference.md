# STAR App API Reference

Comprehensive documentation for the STAR App REST API. All endpoints are served from the same Next.js application and use standard HTTP methods and status codes.

**Base URL:** `https://your-domain.com/api`

**Content-Type:** `application/json` (unless otherwise noted)

---

## Table of Contents

- [Authentication](#authentication)
- [Public Endpoints](#public-endpoints)
- [Speech Endpoints](#speech-endpoints)
- [Brainstorm Endpoint](#brainstorm-endpoint)
- [Auth Endpoints](#auth-endpoints)
- [Admin Endpoints](#admin-endpoints)
  - [GHL Integration](#ghl-integration)
  - [OpenRouter Integration](#openrouter-integration)
  - [Prompt Management](#prompt-management)
  - [Voice Management](#voice-management)

---

## Authentication

The API uses two authentication patterns:

| Pattern | Endpoints | Mechanism |
|---------|-----------|-----------|
| **None** | `/api/questions`, `/api/speeches/*` (public routes), `/api/brainstorm` | No auth required |
| **Session Cookie** | `/api/auth/*`, `/api/admin/*`, `/api/speeches/[id]/generate` | Supabase SSR session cookie |

For admin endpoints, the server validates the session via `supabase.auth.getUser()`. Unauthenticated requests receive `401 Unauthorized`.

---

## Public Endpoints

### `GET /api/questions`

Retrieve all active questions for the speech composition form, ordered by `display_order`.

**Authentication:** None

#### Response — 200 OK

```json
{
  "questions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question_text": "What is the biggest challenge you have overcome?",
      "feeds_section": "story",
      "is_required": true,
      "display_order": 1
    }
  ]
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `questions` | `Question[]` | Array of active questions |
| `questions[].id` | `string` (UUID) | Question identifier |
| `questions[].question_text` | `string` | The question text shown to users |
| `questions[].feeds_section` | `string` | Which speech section this feeds (e.g., `hook`, `story`, `point`, `cta`, `exit`) |
| `questions[].is_required` | `boolean` | Whether the question must be answered |
| `questions[].display_order` | `number` | Sort order ascending |

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `500` | `{ "error": "Failed to fetch questions" }` | Database error |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

## Speech Endpoints

### `POST /api/speeches`

Create a new speech record and queue the generation pipeline (fire-and-forget). Returns immediately with a `pending` speech record.

**Authentication:** None

#### Request Body

```json
{
  "contact": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0123"
  },
  "answers": [
    {
      "questionId": "550e8400-e29b-41d4-a716-446655440000",
      "answer": "I overcame my fear of public speaking by joining Toastmasters."
    }
  ],
  "idempotencyKey": "optional-client-generated-key"
}
```

#### Request Schema (Zod)

```typescript
const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().optional().default(""),
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer:     z.string().min(1),
});

const createSpeechSchema = z.object({
  contact:         contactSchema,
  answers:         z.array(answerSchema).min(1),
  idempotencyKey:  z.string().optional(),
});
```

#### Response — 201 Created

```json
{
  "speech": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "pending",
    "created_at": "2026-04-22T12:00:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `speech.id` | `string` (UUID) | New speech identifier |
| `speech.status` | `string` | Always `"pending"` on creation |
| `speech.created_at` | `string` (ISO 8601) | Creation timestamp |

#### Response — 200 OK (Idempotency Hit)

If the same `idempotencyKey` + contact email + answers combination has been submitted before, the existing speech is returned with `200` instead of creating a duplicate.

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `500` | `{ "error": "Failed to create speech" }` | Database insert error |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

### `GET /api/speeches/{id}`

Retrieve a single speech record by ID, including all transcript sections and metadata.

**Authentication:** None

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Speech identifier |

#### Response — 200 OK

```json
{
  "speech": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0123",
    "status": "complete",
    "transcript": "Full speech transcript text...",
    "audio_url": "https://cdn.example.com/audio/660e.../speech.mp3",
    "answers": [
      { "questionId": "550e...", "answer": "I overcame..." }
    ],
    "created_at": "2026-04-22T12:00:00.000Z",
    "updated_at": "2026-04-22T12:05:00.000Z"
  }
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `speech.id` | `string` (UUID) | Speech identifier |
| `speech.first_name` | `string` | Speaker first name |
| `speech.last_name` | `string` | Speaker last name |
| `speech.email` | `string` | Speaker email |
| `speech.phone` | `string` | Speaker phone |
| `speech.status` | `string` | Pipeline status (see [Speech Statuses](#speech-statuses)) |
| `speech.transcript` | `string \| null` | Full generated transcript |
| `speech.audio_url` | `string \| null` | Public URL to generated audio |
| `speech.answers` | `Answer[]` | User's answers to questions |
| `speech.created_at` | `string` (ISO 8601) | Creation timestamp |
| `speech.updated_at` | `string` (ISO 8601) | Last update timestamp |

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `404` | `{ "error": "Speech not found" }` | Invalid or non-existent ID |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

### `GET /api/speeches/{id}/audio`

Stream the generated MP3 audio for a speech. Supports HTTP Range requests for partial content (useful for audio players).

**Authentication:** None

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Speech identifier |

#### Response — 200 OK (Full Audio)

- **Content-Type:** `audio/mpeg`
- **Headers:** `Accept-Ranges: bytes`, `Cache-Control: public, max-age=86400`
- **Body:** Raw MP3 bytes

#### Response — 206 Partial Content

Returned when a `Range` header is provided. Includes `Content-Range` header.

#### Response — 416 Range Not Satisfiable

Returned when the requested byte range is invalid.

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `404` | `{ "error": "Speech not found" }` | Invalid speech ID |
| `404` | `{ "error": "Audio not yet generated for this speech" }` | Audio pipeline not complete |
| `404` | `{ "error": "Audio file not found in storage" }` | Storage reference broken |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

### `GET /api/speeches/{id}/pdf`

Generate and download a PDF containing the speech transcript sections (hook, story, point, cta, exit).

**Authentication:** None

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Speech identifier |

#### Response — 200 OK

- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="STAR_Speech_{LastName}_{id}.pdf"`
- **Body:** Raw PDF bytes

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `404` | `{ "error": "Speech not found" }` | Invalid speech ID |
| `404` | `{ "error": "Speech transcript not yet generated" }` | No transcript sections available |
| `500` | `{ "error": "Internal server error" }` | PDF generation failure |

---

### `POST /api/speeches/{id}/regenerate`

Queue a regeneration of a speech or a specific transcript section. Updates the speech status to `pending` (full) or keeps current status (section).

**Authentication:** None

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Speech identifier |

#### Request Body

```json
{
  "section": "story"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `section` | `"hook" \| "story" \| "point" \| "cta" \| "exit" \| null` | No | Section to regenerate. Omit or pass `null` for full regeneration. |

#### Response — 200 OK

```json
{
  "speech": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "pending"
  },
  "message": "Regeneration queued"
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `404` | `{ "error": "Speech not found" }` | Invalid speech ID |
| `500` | `{ "error": "Failed to update speech status" }` | Database update error |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

### `POST /api/speeches/{id}/generate`

**Admin only.** Manually trigger the full speech generation pipeline for a speech. Useful for retrying failed speeches or admin-initiated regeneration.

**Authentication:** Session cookie (admin)

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Speech identifier |

#### Request Body

None required.

#### Response — 200 OK (Success)

```json
{
  "success": true,
  "speech": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "complete"
  }
}
```

#### Response — 200 OK (Pipeline Failure)

```json
{
  "success": false,
  "speech": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "failed"
  },
  "error": "Text generation failed: ..."
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `404` | `{ "error": "Speech not found" }` | Invalid speech ID |
| `409` | `{ "error": "Speech generation is already in progress", "speech": { "id", "status" } }` | Status is one of: `upserting_contact`, `generating_text`, `generating_audio`, `uploading`, `syncing_ghl` |
| `500` | `{ "error": "Failed to reset speech status" }` | Database update error |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

## Brainstorm Endpoint

### `POST /api/brainstorm`

SSE (Server-Sent Events) streaming brainstorming assistant powered by OpenRouter. The client sends a question context and message history; the server streams back AI-generated content chunks.

**Authentication:** None

**Content-Type:** `text/event-stream`

#### Request Body

```json
{
  "questionId": "550e8400-e29b-41d4-a716-446655440000",
  "questionText": "What is the biggest challenge you have overcome?",
  "currentAnswer": "I joined Toastmasters...",
  "messages": [
    { "role": "user", "content": "Can you help me expand on this?" },
    { "role": "assistant", "content": "Of course! Let's think about..." }
  ]
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questionId` | `string` | No | Question identifier (for reference) |
| `questionText` | `string` | **Yes** | The question being brainstormed |
| `currentAnswer` | `string` | No | User's current draft answer |
| `messages` | `ChatMessage[]` | No | Conversation history |

```typescript
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

#### Response — SSE Stream

Each event is a content chunk or control signal:

```
data: "That's a powerful story! "

data: "Consider framing it around the moment you first walked into the room..."

data: [DONE]
```

| Event | Format | Description |
|-------|--------|-------------|
| Content chunk | `data: "..."` | JSON-stringified text chunk |
| End signal | `data: [DONE]` | Stream complete |
| Error | `event: error\ndata: {"error":"..."}` | Streaming or API error |

#### Error Responses (Non-SSE)

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Invalid JSON body" }` | Malformed request body |
| `400` | `{ "error": "questionText is required" }` | Missing required field |

---

## Auth Endpoints

### `POST /api/auth/login`

Authenticate a user with email and password via Supabase Auth.

**Authentication:** None

#### Request Body

```json
{
  "email": "admin@example.com",
  "password": "secure-password"
}
```

#### Request Schema (Zod)

```typescript
const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});
```

#### Response — 200 OK

```json
{
  "user": {
    "id": "880e8400-e29b-41d4-a716-446655440002",
    "email": "admin@example.com",
    "aud": "authenticated",
    "role": "authenticated"
  },
  "session": {
    "access_token": "eyJhbG...",
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `401` | `{ "error": "Invalid login credentials" }` | Wrong email or password |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

### `POST /api/auth/logout`

Sign out the current user and invalidate the session.

**Authentication:** Session cookie

#### Request Body

None.

#### Response — 200 OK

```json
{
  "success": true
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `500` | `{ "error": "..." }` | Supabase signOut error |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

### `GET /api/auth/session`

Validate the current session and return the authenticated user.

**Authentication:** Session cookie

#### Response — 200 OK

```json
{
  "user": {
    "id": "880e8400-e29b-41d4-a716-446655440002",
    "email": "admin@example.com",
    "aud": "authenticated",
    "role": "authenticated"
  }
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "Unauthorized" }` | No valid session |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

## Admin Endpoints

All admin endpoints require an active Supabase auth session. Unauthenticated requests receive `401 Unauthorized`.

### GHL Integration

---

#### `PUT /api/admin/ghl`

Save or update the GoHighLevel integration configuration, including encrypted PIT (Personal Access Token), location ID, workflow settings, field mappings, and optional n8n webhook.

**Authentication:** Session cookie (admin)

#### Request Body

```json
{
  "pit": "ghl_pat_xxxxxxxxxxxx",
  "locationId": "abc123",
  "fieldMappings": [
    {
      "starAppField": "first_name",
      "ghlCustomFieldId": "custom_field_123"
    }
  ],
  "workflowId": "workflow_456",
  "triggerEvent": "speech_completed",
  "n8nWebhookUrl": "https://n8n.example.com/webhook/speech",
  "n8nEnabled": true
}
```

#### Request Schema (Zod)

```typescript
const fieldMappingSchema = z.object({
  starAppField:    z.string().min(1),
  ghlCustomFieldId: z.string().min(1),
});

const putGhlConfigSchema = z.object({
  pit:              z.string().min(1),
  locationId:       z.string().min(1),
  fieldMappings:    z.array(fieldMappingSchema).min(1),
  workflowId:       z.string().min(1),
  triggerEvent:     z.string().min(1),
  n8nWebhookUrl:    z.string().url().or(z.literal("")),
  n8nEnabled:       z.boolean(),
});
```

#### Response — 200 OK

```json
{
  "ok": true
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Failed to encrypt PIT..." }` | Encryption failure |
| `500` | `{ "error": "Database error" }` | Database query failure |
| `500` | `{ "error": "Failed to save field mappings" }` | Mapping insert failure |

---

#### `POST /api/admin/ghl/test`

Test the GHL connection by validating a PIT against the location and custom fields endpoints.

**Authentication:** Session cookie (admin)

#### Request Body

```json
{
  "pit": "ghl_pat_xxxxxxxxxxxx",
  "locationId": "abc123"
}
```

#### Request Schema (Zod)

```typescript
const testSchema = z.object({
  pit:        z.string().min(1),
  locationId: z.string().min(1),
});
```

#### Response — 200 OK (Success)

```json
{
  "ok": true,
  "locationName": "My Agency",
  "customFieldCount": 12
}
```

#### Response — 200 OK (Failure)

```json
{
  "ok": false,
  "errors": [
    "PIT is invalid or expired (401 Unauthorized)."
  ]
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |

---

### OpenRouter Integration

---

#### `PUT /api/admin/openrouter`

Save or update the OpenRouter integration configuration, including encrypted API key and model slot settings.

**Authentication:** Session cookie (admin)

#### Request Body

```json
{
  "apiKey": "sk-or-v1-xxxxxxxxxxxx",
  "slots": {
    "primary": {
      "modelId": "anthropic/claude-sonnet-4-6",
      "temperature": 0.7,
      "maxTokens": 4096
    },
    "brainstorm": {
      "modelId": "anthropic/claude-sonnet-4-6",
      "temperature": 0.9,
      "maxTokens": 2048,
      "usePrimary": false
    }
  }
}
```

#### Request Schema (Zod)

```typescript
const slotConfigSchema = z.object({
  modelId:      z.string().min(1),
  temperature:  z.number().min(0).max(2),
  maxTokens:    z.number().int().min(1),
});

const brainstormSlotSchema = slotConfigSchema.extend({
  usePrimary: z.boolean().optional().default(false),
});

const putOpenRouterConfigSchema = z.object({
  apiKey: z.string().min(1),
  slots: z.object({
    primary:    slotConfigSchema,
    brainstorm: brainstormSlotSchema,
  }),
});
```

#### Response — 200 OK

```json
{
  "ok": true
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Failed to encrypt API key..." }` | Encryption failure |
| `500` | `{ "error": "Failed to save primary model slot." }` | Database upsert error |

---

#### `GET /api/admin/openrouter/models`

List available models from OpenRouter, returned from a 60-minute in-memory cache.

**Authentication:** Session cookie (admin)

#### Response — 200 OK

```json
{
  "models": [
    {
      "id": "anthropic/claude-sonnet-4-6",
      "name": "Claude Sonnet 4.6",
      "context_length": 200000,
      "pricing": {
        "prompt": "0.000003",
        "completion": "0.000015"
      }
    }
  ]
}
```

#### Response — 200 OK (Not Configured)

```json
{
  "models": [],
  "error": "No API key configured"
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

#### `POST /api/admin/openrouter/test`

Test an OpenRouter API key by calling the `/auth/key` endpoint and returning credit balance.

**Authentication:** Session cookie (admin)

#### Request Body

```json
{
  "apiKey": "sk-or-v1-xxxxxxxxxxxx"
}
```

#### Request Schema (Zod)

```typescript
const testSchema = z.object({
  apiKey: z.string().min(1),
});
```

#### Response — 200 OK (Success)

```json
{
  "ok": true,
  "credits": 42.50
}
```

#### Response — 200 OK (Failure)

```json
{
  "ok": false,
  "error": "API returned 401: Invalid key"
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Internal server error" }` | Unexpected exception |

---

### Prompt Management

---

#### `GET /api/admin/prompts`

List all prompt versions, newest first.

**Authentication:** Session cookie (admin)

#### Response — 200 OK

```json
{
  "prompts": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "version": 3,
      "content": "You are a world-class speechwriter...",
      "is_active": true,
      "created_at": "2026-04-22T12:00:00.000Z"
    }
  ]
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Failed to fetch prompts" }` | Database error |

---

#### `POST /api/admin/prompts`

Create a new prompt version. Automatically deactivates all existing prompts and sets the new one as active.

**Authentication:** Session cookie (admin)

#### Request Body

```json
{
  "content": "You are a world-class speechwriter..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | **Yes** | Prompt content (non-empty) |

#### Response — 201 Created

```json
{
  "prompt": {
    "id": "770e8400-e29b-41d4-a716-446655440004",
    "version": 4,
    "content": "You are a world-class speechwriter...",
    "is_active": true
  }
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "content is required and must be a non-empty string" }` | Missing or empty content |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Failed to deactivate previous prompts" }` | Database update error |
| `500` | `{ "error": "Failed to create prompt" }` | Database insert error |

---

#### `POST /api/admin/prompts/{id}/rollback`

Rollback to a previous prompt version. Creates a new prompt row with the old content (preserves version history).

**Authentication:** Session cookie (admin)

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Prompt version ID to rollback to |

#### Request Body

None.

#### Response — 201 Created

```json
{
  "prompt": {
    "id": "770e8400-e29b-41d4-a716-446655440005",
    "version": 5,
    "content": "You are a world-class speechwriter...",
    "is_active": true
  }
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "This prompt version is already active" }` | Target is already active |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `404` | `{ "error": "Prompt version not found" }` | Invalid prompt ID |
| `500` | `{ "error": "Failed to deactivate current prompt" }` | Database update error |
| `500` | `{ "error": "Failed to create rollback prompt" }` | Database insert error |

---

### Voice Management

---

#### `GET /api/admin/voices`

List all configured Fish Audio voices, newest first.

**Authentication:** Session cookie (admin)

#### Response — 200 OK

```json
{
  "voices": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440006",
      "fish_audio_voice_id": "e75e1618ff544059be71409c5126b4c0",
      "label": "Stefan",
      "is_active": true,
      "created_at": "2026-04-22T12:00:00.000Z"
    }
  ]
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Failed to fetch voices" }` | Database error |

---

#### `POST /api/admin/voices`

Add a new Fish Audio voice. If `isActive` is `true`, all other voices are deactivated first (only one active voice at a time).

**Authentication:** Session cookie (admin)

#### Request Body

```json
{
  "fishAudioVoiceId": "e75e1618ff544059be71409c5126b4c0",
  "label": "Stefan",
  "isActive": true
}
```

#### Request Schema (Zod)

```typescript
const createVoiceSchema = z.object({
  fishAudioVoiceId: z.string().min(1),
  label:            z.string().min(1),
  isActive:         z.boolean().optional().default(false),
});
```

#### Response — 201 Created

```json
{
  "voice": {
    "id": "880e8400-e29b-41d4-a716-446655440006",
    "fish_audio_voice_id": "e75e1618ff544059be71409c5126b4c0",
    "label": "Stefan",
    "is_active": true,
    "created_at": "2026-04-22T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Failed to deactivate previous voices" }` | Database update error |
| `500` | `{ "error": "Failed to create voice" }` | Database insert error |

---

#### `PATCH /api/admin/voices/{id}`

Update a voice's label, Fish Audio voice ID, or active status. Setting `isActive: true` deactivates all other voices first.

**Authentication:** Session cookie (admin)

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Voice identifier |

#### Request Body

```json
{
  "label": "Stefan Updated",
  "fishAudioVoiceId": "e75e1618ff544059be71409c5126b4c0",
  "isActive": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | `string` | No | New display label |
| `fishAudioVoiceId` | `string` | No | New Fish Audio voice ID |
| `isActive` | `boolean` | No | Set active status |

#### Response — 200 OK

```json
{
  "voice": {
    "id": "880e8400-e29b-41d4-a716-446655440006",
    "fishAudioVoiceId": "e75e1618ff544059be71409c5126b4c0",
    "label": "Stefan Updated",
    "sampleUrl": null,
    "isActive": true,
    "createdAt": "2026-04-22T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "No valid fields to update" }` | Empty or invalid body |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `404` | `{ "error": "Voice not found" }` | Invalid voice ID |
| `500` | `{ "error": "Failed to deactivate existing active voice" }` | Database update error |
| `500` | `{ "error": "Failed to update voice" }` | Database update error |

---

#### `DELETE /api/admin/voices/{id}`

Delete a voice. The currently active voice cannot be deleted; deactivate it first.

**Authentication:** Session cookie (admin)

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Voice identifier |

#### Response — 200 OK

```json
{
  "ok": true
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Cannot delete the active voice. Deactivate it first." }` | Trying to delete active voice |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `404` | `{ "error": "Voice not found" }` | Invalid voice ID |
| `500` | `{ "error": "Failed to delete voice" }` | Database delete error |

---

#### `POST /api/admin/voices/preview`

Generate a short MP3 audio preview of a Fish Audio voice. Returns raw audio bytes.

**Authentication:** Session cookie (admin)

#### Request Body

```json
{
  "fishAudioVoiceId": "e75e1618ff544059be71409c5126b4c0",
  "text": "This is a preview of the selected voice for your STAR speeches."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fishAudioVoiceId` | `string` | **Yes** | Fish Audio voice ID |
| `text` | `string` | No | Preview text (defaults to built-in message) |

#### Response — 200 OK

- **Content-Type:** `audio/mpeg`
- **Cache-Control:** `no-store`
- **Body:** Raw MP3 bytes

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Invalid JSON body" }` | Malformed request body |
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Zod validation failure |
| `401` | `{ "error": "Unauthorized" }` | Not authenticated |
| `500` | `{ "error": "Voice synthesis failed: ..." }` | Fish Audio API error |
| `500` | `{ "error": "Voice synthesis failed" }` | Unexpected synthesis error |

---

## Appendix

### Speech Statuses

| Status | Description |
|--------|-------------|
| `pending` | Record created, pipeline not yet started |
| `upserting_contact` | Creating/updating GHL contact |
| `generating_text` | LLM generating transcript sections |
| `generating_audio` | Fish Audio TTS generating MP3 |
| `uploading` | Uploading audio to GHL |
| `syncing_ghl` | Triggering GHL workflow |
| `complete` | All pipeline stages succeeded |
| `failed` | One or more pipeline stages failed |

### Common Error Response Shape

All JSON error responses follow this structure:

```json
{
  "error": "Human-readable error message",
  "details": {          // Optional — only on validation errors
    "fieldName": ["Error message 1", "Error message 2"]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK — Request succeeded |
| `201` | Created — Resource created successfully |
| `206` | Partial Content — Audio range response |
| `400` | Bad Request — Validation or malformed request |
| `401` | Unauthorized — Missing or invalid session |
| `404` | Not Found — Resource does not exist |
| `409` | Conflict — Operation already in progress |
| `416` | Range Not Satisfiable — Invalid byte range |
| `500` | Internal Server Error — Unexpected server failure |
