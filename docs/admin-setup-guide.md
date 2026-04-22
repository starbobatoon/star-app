# STAR App — Admin Setup Guide

*Written for Christy, the platform admin.*

This guide walks you through setting up and configuring the STAR App (also branded as **Elocutionist**) after it has been deployed. You do not need to write code. Everything in this guide is done through the web-based admin console.

---

## Table of Contents

1. [Initial Login](#1-initial-login)
2. [OpenRouter Configuration](#2-openrouter-configuration)
3. [GoHighLevel Integration](#3-gohighlevel-integration)
4. [Voice Configuration](#4-voice-configuration)
5. [Prompt Management](#5-prompt-management)
6. [Question Manager](#6-question-manager)

---

## 1. Initial Login

### How to access the admin console

Open your web browser and go to:

```
https://your-domain.com/admin/login
```

Replace `your-domain.com` with the actual domain where the app is hosted.

You will see a login page titled **"STAR Admin"** with fields for **Email** and **Password**.

### Default credentials

Your developer set the initial admin credentials in a file called `.env.local` on the server. The relevant settings are:

```
ADMIN_EMAIL=trevor@blackceo.com
ADMIN_INITIAL_PASSWORD=sKTGYa0FPzdLrXehON6a
```

Use the email and password shown above (or whatever your developer provided) to log in for the first time.

> **Important:** The password is handled through **Supabase Auth**. After your first login, you should change it immediately for security.

### What happens after login

After signing in, the system stores an encrypted session cookie in your browser. You will be redirected to the **Dashboard** at `/admin`.

If you try to visit any admin page while not logged in, the system will automatically redirect you back to `/admin/login`. After logging in, you are sent to the page you originally tried to visit.

### Changing your password

To change your password, you need to use Supabase's password reset flow or ask your developer to update the credentials in `.env.local` and reset the auth user directly in the Supabase dashboard.

> **Security note:** The admin middleware (`src/middleware.ts`) checks every `/admin/*` route. Only authenticated users can access admin pages or admin API endpoints. Unauthenticated API requests receive a `401 Unauthorized` response.

---

## 2. OpenRouter Configuration

**URL:** `/admin/openrouter`

This page configures the AI models that generate speeches. Without this step, the app cannot create speeches.

### Step 1: Get your OpenRouter API key

1. Go to [https://openrouter.ai](https://openrouter.ai) and sign up for an account.
2. Navigate to **Keys** in your account settings.
3. Create a new API key. It will look like `sk-or-v1-...`.
4. Copy the key to your clipboard.

### Step 2: Enter the API key in the admin

1. In the admin console, go to **Model Settings** in the left sidebar (or visit `/admin/openrouter`).
2. Find the section labeled **API Key**.
3. Paste your key into the input field. Click **SHOW** if you want to verify it looks correct, then click **HIDE**.
4. Click **Test Connection**.

If the key is valid, you will see:
- A green **Connected** tag
- Your remaining credits (for example: `$14.37 remaining`)

If it fails, you will see a red **Connection Failed** tag. Double-check that you copied the full key.

### Step 3: Select models for the two slots

The app uses two model slots, stored in the `model_slots` database table:

| Slot | Purpose | Default | Stored Columns |
|------|---------|---------|----------------|
| **Primary** | Full speech generation (drafting, structuring, final output) | `google/gemini-3-pro` | `model_id`, `temperature`, `max_output_tokens` |
| **Brainstorm** | Free-form ideation and creative exploration | `google/gemini-2.5-flash` | `model_id`, `temperature`, `max_output_tokens` |

On the **Model Slots** card:

1. Choose a model from the dropdown for the **Primary** slot.
2. Choose a model for the **Brainstorm** slot.
3. Alternatively, check **"Use Primary model for brainstorming"** to make both slots use the same model. This is simpler but gives you less flexibility.

> **Tip:** You can preview model details (context window size, pricing per million tokens) by selecting a model from the **Available Models** dropdown above.

### Step 4: Set temperature and token limits

On the **Temperature & Settings** card, you will see two columns: one for the Primary slot and one for the Brainstorm slot.

**Temperature** controls how creative or predictable the AI output is:

| Temperature | Effect | Best For |
|-------------|--------|----------|
| **0.0 - 0.3** | Very precise, repetitive, factual | Legal text, strict templates |
| **0.4 - 0.7** | Balanced, reliable, slightly varied | **Primary speech generation** |
| **0.8 - 1.2** | Creative, varied, expressive | **Brainstorming and ideation** |
| **1.3 - 2.0** | Very random, experimental, unpredictable | Poetry, wild ideas (not recommended for speeches) |

**Recommended defaults:**
- **Primary:** `0.70` (balanced reliability)
- **Brainstorm:** `0.80` (slightly more creative)

**Max Output Tokens** controls how long the response can be:
- **Primary:** `4096` tokens (enough for a full speech)
- **Brainstorm:** `2048` tokens (shorter, conversational)

After making changes, click **Save Configuration** at the bottom of the page.

### How it is stored

Your settings are saved to the database in these tables:

- **`openrouter_integration`** — stores the encrypted API key, a preview of the last 4 characters, and whether the integration is configured.
- **`model_slots`** — stores the model ID, temperature, and max output tokens for each slot (`primary` and `brainstorm`).

Both tables are protected by Row Level Security (RLS). Only authenticated admin users can read or write them.

---

## 3. GoHighLevel Integration

**URL:** `/admin/ghl-integration`

This page connects the STAR App to your GoHighLevel (GHL) CRM so that:
- Contact information from speeches is synced to GHL
- Custom fields are populated with speech data
- Workflows can be triggered automatically when a speech is ready

### Step 1: Find your GHL credentials

You need two pieces of information from GoHighLevel:

#### A. Private Integration Token (PIT)

1. Log in to your GoHighLevel sub-account.
2. Go to **Settings** > **Integrations** (or **Settings** > **API**).
3. Look for **Private Integration Token** or **API Key**.
4. Generate a new token if one does not exist.
5. Copy the full token. It is a long string of letters and numbers.

#### B. Location ID

1. In GoHighLevel, look at the URL in your browser. It often contains the location ID.
2. Alternatively, go to **Settings** > **Business Profile** or **Settings** > **Account**.
3. The Location ID is a short alphanumeric string (for example: `abc123XYZ`).

### Step 2: Enter credentials and test

1. In the admin console, go to **Connect GHL** (or visit `/admin/ghl-integration`).
2. Paste your **Private Integration Token** into the first field.
3. Paste your **Location ID** into the second field.
4. Click **Test Connection**.

The test runs two checks:

1. **Location check:** Verifies the Location ID exists and the PIT can access it.
2. **Scope check:** Verifies the PIT has permission to read and write custom fields.

If both pass, you will see:
```
✅ Christy's Coaching HQ (Scope verified: customFields access confirmed)
```

If it fails, the error message will tell you exactly what is wrong (invalid token, wrong location, missing scope, etc.).

### Step 3: Understand field mapping

The app maps data from the STAR App into GHL custom fields. There are two layers:

#### Standard fields (automatic)

These are hard-coded and require no setup:

| STAR App Field | GHL Field Key | Meaning |
|----------------|---------------|---------|
| First Name | `firstName` | Contact's first name |
| Last Name | `lastName` | Contact's last name |
| Email | `email` | Contact's email address |
| Phone | `phone` | Contact's phone number |

#### Custom fields (you configure)

These are stored in the **`ghl_field_mappings`** table. Each row connects a STAR data key to a GHL custom field ID:

| STAR Data Key | Example GHL Custom Field | Stored In |
|---------------|-------------------------|-----------|
| `audio_url` | `star_audio_link` | `ghl_field_mappings.star_data_key` |
| `pdf_url` | `star_speech_link` | `ghl_field_mappings.star_data_key` |
| `q1_message` | `star_q1_message` | `ghl_field_mappings.star_data_key` |
| `q2_audience` | `star_q2_audience` | `ghl_field_mappings.star_data_key` |
| ... | ... | ... |

On the **Custom Field Mapping** section of the page:

1. Each row shows a STAR data point on the left.
2. On the right, select the matching GHL custom field from the dropdown.
3. If you do not see your GHL fields, click **Refresh Fields from GHL** to pull the latest list.

> **Before you map:** Create the custom fields in GHL first. The suggested names follow the pattern `star_{field_name}` for consistency. Recommended field types are shown in the **Suggested Custom Field Names** table on the same page.

### Step 4: Set up workflow triggers

When a speech is finalized, the app can automatically trigger a GHL workflow.

1. In the **Email Workflow Trigger** section, enter:
   - **GHL Workflow ID**: Found in GHL under **Automation** > **Workflows** > click the workflow > **Settings**. It looks like `wf_abc123XYZ`.
   - **Trigger Event Name**: The default is `star_speech_ready`. You can change it, but it must match the webhook trigger event name in your GHL workflow exactly.

2. In GHL, create or edit a workflow:
   - Add a **Webhook** trigger.
   - Set the event name to `star_speech_ready` (or whatever you chose).
   - Build the rest of the workflow to send an email, tag the contact, etc.

3. Optional: Enable the **n8n Webhook** toggle if you want to forward speech data to an n8n automation as well. Enter the webhook URL when enabled.

### How it is stored

- **`ghl_integration`** — singleton table storing the encrypted PIT, location ID, workflow ID, trigger event, and n8n webhook settings.
- **`ghl_field_mappings`** — one row per mapped field, linking `star_data_key` to `ghl_custom_field_id`.

---

## 4. Voice Configuration

**URL:** `/admin/voices`

This page manages the text-to-speech voices used to generate audio versions of speeches. The app uses **Fish Audio** as the voice provider.

### Step 1: Get a Fish Audio voice ID

1. Go to [https://fish.audio](https://fish.audio) and log in to your developer account.
2. Navigate to your **Voices** or **Library** section.
3. Find or create a voice you want to use.
4. Copy the **Voice ID** (a UUID that looks like `e75e1618ff544059be71409c5126b4c0`).

### Step 2: Add the voice to the app

1. In the admin console, go to **Voice Config** (or visit `/admin/voices`).
2. Click **Add Voice**.
3. Enter a **Voice Label** — a friendly name you will recognize (for example: "Christy Female Pro").
4. Paste the **Fish Audio Voice ID** into the second field.
5. Click **Add**.

The voice is now saved in the **`voices`** database table with these columns:

| Column | Example Value | Meaning |
|--------|---------------|---------|
| `id` | auto-generated UUID | Internal record ID |
| `fish_audio_voice_id` | `e75e1618ff544059be71409c5126b4c0` | The Fish Audio voice UUID |
| `label` | "Christy Female Pro" | Your friendly name |
| `is_active` | `false` initially | Whether this voice is used for generation |
| `created_at` | timestamp | When you added it |

### Step 3: Preview the voice

Each voice card has a **Preview** section:

1. You can type custom text into the preview box (default: "The quick brown fox jumps over the lazy dog.").
2. Click **Preview**.
3. The app calls Fish Audio and plays a short audio clip.
4. Click **Stop** if you want to stop playback early.

> **Note:** Preview generation uses your Fish Audio API credits. The `FISH_AUDIO_API_KEY` is stored in `.env.local` and is handled server-side.

### Step 4: Set the active voice

Only one voice can be active at a time. This is enforced by the database (unique index `one_active_voice` on `voices.is_active` where `is_active = true`).

To activate a voice:

1. Find the voice card you want to use.
2. Click **Set as Active**.
3. The previously active voice automatically becomes inactive.

The active voice is used for all future speech audio generations.

### Deleting a voice

To remove a voice:

1. Find the voice card.
2. Click **Delete**.

> **Important:** You cannot delete the currently active voice. Deactivate it first by setting another voice as active.

---

## 5. Prompt Management

**URL:** `/admin/prompt`

This page controls the **system prompt** — the hidden instructions sent to the AI every time it writes a speech. The prompt determines the tone, structure, and style of every generated speech.

### How prompt versioning works

Prompts are stored in the **`prompts`** database table:

| Column | Meaning |
|--------|---------|
| `id` | Unique record ID |
| `version` | Integer version number (1, 2, 3, etc.) |
| `content` | The full text of the system prompt |
| `is_active` | Exactly one prompt is active at any time |
| `created_at` | When this version was saved |
| `created_by` | Which admin user created it |
| `notes` | Optional description of the change |

**Key rule:** There is always exactly one active prompt. This is enforced by the database (unique index `one_active_prompt` on `prompts.is_active` where `is_active = true`).

When you save changes:
1. The currently active prompt is deactivated.
2. A **new version** is created with your changes.
3. The new version becomes the active prompt.

> **Old versions are never deleted.** This is what makes rollback possible.

### When to edit the prompt

You should edit the prompt when you want to change:

- **Tone:** Should speeches sound more formal, more conversational, more inspirational?
- **Structure:** Should the word count per section change? Should sections be added or removed?
- **Language rules:** Should the AI use contractions? Avoid certain words? Lead with feelings vs. facts?
- **Output format:** Should the AI return different JSON fields?

**Do not edit the prompt** for one-time changes to a single speech. Edit the prompt only when you want to change the rules for **all future speeches**.

### How to edit the prompt

1. Go to `/admin/prompt`.
2. In the large text area labeled **Systemic Imperatives**, edit the text.
3. The border turns blue when you have unsaved changes.
4. Review the character count at the bottom.
5. Click **Commit Prompt** to save.
6. A toast notification appears confirming the new version number (for example: "Version 6 saved and activated").

### Rollback procedure

If a new prompt produces worse results, you can roll back to any previous version in seconds:

1. Scroll down to the **Version History** section.
2. Find the version you want to restore.
3. Click **Roll Back** on that version's row.
4. The system creates a **new version** (with the next version number) containing the old content.
5. This new version becomes active immediately.

> **Example:** You are on version 6. You roll back to version 4. The system creates version 7 with version 4's content, and version 7 becomes active. Version 6 is preserved in history.

Behind the scenes, rollback calls:
```
POST /api/admin/prompts/{id}/rollback
```

This endpoint reads the target version, deactivates the current version, and inserts a new row with the old content.

---

## 6. Question Manager

**URL:** `/admin/questions`

This page controls the intake questionnaire that users fill out before a speech is generated. Each answer feeds into a specific section of the speech (Hook, Story, Point, CTA, Exit, or Meta).

### How questions are stored

Questions live in the **`questions`** database table:

| Column | Meaning | Example |
|--------|---------|---------|
| `id` | Unique record ID | auto-generated UUID |
| `display_order` | Position in the form (1, 2, 3, ...) | `1` |
| `question_text` | The text the user sees | "What is your speech about in one sentence?" |
| `helper_text` | Optional hint below the question | "Think of the ONE thing..." |
| `feeds_section` | Which speech section this feeds | `map`, `hook`, `story`, `point`, `cta`, `exit`, `meta` |
| `is_required` | Must the user answer this? | `true` or `false` |
| `is_active` | Is this question shown on the form? | `true` or `false` |
| `ghl_field_key` | Maps to a GHL custom field | `star_q1_message` |
| `ghl_custom_field_id` | The actual GHL field ID | (set by integration) |

### How to reorder questions

On the Question Manager page, each question has **up (▲)** and **down (▼)** arrows on the left side:

1. Click **▲** to move a question up one position.
2. Click **▼** to move a question down one position.
3. The `display_order` column is automatically renumbered for you.

> **Tip:** The order of questions matters. Put the most important, foundational questions first (like core message and audience) so users build momentum.

### How to add a new question

1. Click **Add New Question** (top right of the page).
2. In the modal that appears, fill in:
   - **Question Text** — what the user sees (required)
   - **Feeds Section** — which speech part this answer feeds:
     - `Map` — Message, Audience, Purpose (derived context)
     - `Hook` — Opening attention-grabber
     - `Story` — Personal narrative
     - `Point` — Core lesson / signature phrase
     - `CTA` — Call to action
     - `Exit` — Closing sign-off
     - `Meta` — Tone, context, venue details
   - **Maps to GHL Field** — optionally link this answer to a GHL custom field
   - **Required** toggle — on if the user must answer
   - **Visible** toggle — on if this question appears on the form
3. Click **Add Question**.

The new question appears at the bottom of the list with the next display order number.

### How to edit a question

1. Find the question in the list.
2. Click the **pencil (✏️)** icon on the right.
3. Edit any field in the modal.
4. Click **Save Changes**.

### How to delete a question

1. Find the question in the list.
2. Click the **trash (🗑)** icon on the right.
3. A confirmation modal shows the question text and warns: **"This action cannot be undone."**
4. Click **Delete** to confirm.

> **Note:** Deleting a question permanently removes it. If you might need it again, consider hiding it instead (see below).

### Required vs. Optional

Each question has a **Required** toggle:

- **Required (on):** The user cannot submit the form without answering this question. A red asterisk or validation message appears.
- **Optional (off):** The user can skip it. The AI will fill in the gap or use defaults.

**Best practices:**
- Make foundational questions **required** (core message, audience, desired outcome, CTA).
- Make stylistic or optional questions **optional** (hook style preference, closing tagline, tone nuances).
- If a question is optional but the user leaves it blank, the AI generates appropriate content based on the other answers.

### Hiding vs. deleting

Each question has an **eye (👁)** icon:

- **Visible (👁):** The question appears on the public form.
- **Hidden (👁‍🗨):** The question is removed from the form but kept in the database. Hidden questions have a strikethrough style and reduced opacity.

**When to hide:**
- A question is seasonal or event-specific.
- You are testing a new question and do not want it live yet.
- You want to preserve the question data and GHL mapping for later.

**When to delete:**
- The question is permanently no longer needed.
- You created it by mistake.

### Section mapping explained

The **Feeds Section** column determines where the user's answer is injected into the speech:

| Section | Speech Part | Typical Questions |
|---------|-------------|-------------------|
| **Map** | Context layer (not spoken) | Core message, audience description, desired outcome |
| **Hook** | First 30 seconds | How to grab attention |
| **Story** | 60-90 second narrative | Personal story, lesson learned |
| **Point** | 2-minute core lesson | Signature phrase, key takeaway |
| **CTA** | 30-second directive | Specific action to take |
| **Exit** | 15-second close | Closing tagline or mic-drop |
| **Meta** | Tone / context | Venue, formality level, duration |

Each section tag is color-coded on the Question Manager page for quick visual scanning.

### GHL field mapping per question

Each question can optionally map to a GHL custom field. This means the user's answer is automatically written back to their GHL contact record.

To set this up:

1. In the question row, click the **Map GHL** button (or the currently mapped field name).
2. Select the matching GHL custom field from the dropdown.
3. If the field is not listed, first create it in GHL, then click **Refresh Fields from GHL** on the GHL Integration page.

> **Tip:** The default seed data already maps all 10 questions to GHL fields (`star_q1_message` through `star_q10_context`). You only need to change these if your GHL custom field names are different.

---

## Quick Reference: Admin URLs

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/admin` | Overview, stats, recent speeches |
| Login | `/admin/login` | Sign in to the admin console |
| OpenRouter | `/admin/openrouter` | AI model and API key configuration |
| GHL Integration | `/admin/ghl-integration` | CRM connection and field mapping |
| Voice Config | `/admin/voices` | Fish Audio voice management |
| Prompt Settings | `/admin/prompt` | System prompt editing and versioning |
| Question Manager | `/admin/questions` | Intake questionnaire configuration |

---

## Quick Reference: Database Tables

| Table | What It Stores |
|-------|---------------|
| `prompts` | Versioned system prompts for speech generation |
| `openrouter_integration` | Encrypted OpenRouter API key and status |
| `model_slots` | Model assignments for Primary and Brainstorm slots |
| `voices` | Fish Audio voice IDs and active selection |
| `questions` | Intake form questions, order, and section mapping |
| `speeches` | Generated speech records and lifecycle status |
| `ghl_integration` | Encrypted GHL PIT, location ID, workflow settings |
| `ghl_field_mappings` | Maps STAR data keys to GHL custom field IDs |
| `audit_log` | Record of all admin changes |

---

## Need Help?

If something in this guide does not match what you see on screen, or if a configuration step fails:

1. Check the browser's developer console (F12) for error messages.
2. Verify your credentials are correct (API keys, tokens, IDs).
3. Ask your developer to check the server logs for detailed error messages.
4. Every admin action is recorded in the **`audit_log`** table for troubleshooting.
