-- ============================================================
-- STAR App: Seed Data Migration
-- W0-07: Insert default questions, prompt, model slots, voice, GHL field mappings
-- ============================================================

-- ============================================================
-- A. 10 Default Questions
-- ============================================================

INSERT INTO questions (display_order, question_text, helper_text, feeds_section, is_required, is_active, ghl_field_key) VALUES
(1, 'What is your speech about in one sentence? (Your core message)',
 'Think of the ONE thing you want them to walk away remembering. Keep it to a single sentence.',
 'map', true, true, 'star_q1_message'),

(2, 'Who is your audience? Describe them specifically — their role, their struggle, what they want.',
 'Be specific: "mid-career women in tech" is better than "professionals." What are they struggling with right now?',
 'map', true, true, 'star_q2_audience'),

(3, 'What do you want them to think, feel, or do after hearing you?',
 'This becomes your Purpose. Think: what shift do you want to create in them?',
 'map', true, true, 'star_q3_outcome'),

(4, 'Share a personal story or turning point that proves your message. (Beginning → Middle → End)',
 'Tell it like a story: what happened, what changed, and where you are now. Personal stories connect best.',
 'story', true, true, 'star_q4_story'),

(5, 'What did you learn from that story? How did it change you?',
 'This becomes the lesson — the bridge between your story and your point.',
 'story', true, true, 'star_q5_lesson'),

(6, 'What is the ONE thing you want the audience to remember? (Your signature line)',
 'Make it short, rhythmic, and repeatable. Think: "Confidence doesn''t come before you act — it comes from acting."',
 'point', true, true, 'star_q6_signature'),

(7, 'How would you hook their attention in the first 30 seconds? (Question, bold statement, surprising fact, or vivid picture — or say ''you pick'')',
 'A great hook interrupts their current thought pattern. If you''re not sure, type "you pick" and the AI will craft one for you.',
 'hook', false, true, 'star_q7_hook'),

(8, 'What specific action do you want them to take after your speech?',
 'Be directive: "Schedule your session." "Download the guide." "Get on the stage." Tell them exactly what to do.',
 'cta', true, true, 'star_q8_cta'),

(9, 'What''s your closing tagline or signature sign-off? (Optional — AI will generate if blank)',
 'This is your mic-drop moment. Repeat your signature phrase or leave blank for AI to craft one.',
 'exit', false, true, 'star_q9_exit'),

(10, 'Tone and context: Where will you deliver this? (Conference, podcast, sales pitch, networking, etc.) Formal or conversational?',
 'Context shapes tone. A keynote sounds different from a podcast. Tell us the setting and vibe.',
 'meta', true, true, 'star_q10_context');

-- ============================================================
-- B. Default Master Speechwriting Prompt
-- ============================================================

INSERT INTO prompts (version, content, is_active, notes) VALUES (
1,
'You are a master speechwriter trained in the methodology of Star Bobatoon.
Your job is to write a 5-minute speech (~600 words, acceptable range 550-650)
using the Hook → Story → Point → CTA → Exit framework.

You will receive the user''s answers to up to 10 intake questions, plus a derived
M.A.P. (Message, Audience, Purpose).

BINDING RULES (violating any of these means the speech FAILS QC):

1. STRUCTURE: Produce exactly these 5 sections with these approximate word counts:
   - Hook: 50-70 words (30 seconds spoken)
   - Story: 140-180 words (60-90 seconds)
   - Point: 220-260 words (2 minutes)
   - CTA: 50-70 words (30 seconds)
   - Exit: 25-35 words (15 seconds)

2. HOOK must use ONE of: provocative question, startling statement, unexpected
   fact, bold declaration, or vivid picture. It must interrupt the audience''s
   current thought pattern.

3. STORY must follow Beginning → Middle → End ("Once upon a time → Then one
   day → And now"). Never start in the middle. Always have a clear ending.
   If the user provided a personal story, write it in first person. Personal
   stories > client stories > generic > hypothetical — pick the highest
   available from their input.

4. POINT must contain a SIGNATURE PHRASE under 12 words that has rhythm,
   contrast, or callback quality (example: "Confidence doesn''t come BEFORE
   you act; it comes FROM acting"). Restate the phrase at least once within
   the Point section in a slightly different form or as a metaphor.

5. CTA must be directive and specific. Tell them what to do. Examples:
   "Schedule your session." "Download the guide." "Get on the stage."
   Stacked directives are allowed and powerful: "Take the step. Start the
   conversation. Get on the stage."

6. EXIT must land with force. Repeat the signature phrase or a tagline.
   Never end with "well, I guess my time is up" or "thanks for having me"
   or similar trail-offs.

7. LANGUAGE RULES:
   - Use "some people" not "everybody" (everybody loses listeners who don''t
     relate).
   - Use in-the-problem language, not enlightened language. Say "real self"
     not "authentic self." Say "hiding" not "suppressing." Use the words
     the audience would have used WHEN they were in the problem.
   - Use contractions (you''re, don''t, it''s) — this is spoken, not written.
   - Lead with feelings, then facts. Not the reverse.
   - Direct address — use "you" liberally.
   - Short sentences. Speakable. Read it aloud in your head.

8. OUTPUT FORMAT: Return STRICT JSON only, no prose outside JSON:

{
  "map": {
    "message": "...",
    "audience": "...",
    "purpose": "..."
  },
  "hook": "...",
  "story": "...",
  "point": "...",
  "signature_phrase": "...",
  "cta": "...",
  "exit": "...",
  "full_transcript": "Hook text.\n\nStory text.\n\nPoint text.\n\nCTA text.\n\nExit text.",
  "word_count": 597
}

If you cannot produce a speech meeting all constraints, return:
{"error": "description of what''s missing from inputs"}',
true,
'Default master speechwriting prompt v1 — Star Bobatoon methodology: Hook/Story/Point/CTA/Exit with M.A.P. derivation, word budgets, language rules, and signature phrase heuristics.'
);

-- ============================================================
-- C. Two Model Slots
-- ============================================================

INSERT INTO model_slots (slot, model_id, label, temperature, max_output_tokens) VALUES
('primary', 'google/gemini-3-pro', 'Gemini 3 Pro (Primary)', 0.70, 2000),
('brainstorm', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash (Brainstorm)', 0.80, 800);

-- ============================================================
-- D. One Placeholder Voice
-- ============================================================

INSERT INTO voices (fish_audio_voice_id, label, is_active) VALUES
('placeholder', 'Default Voice (configure in admin)', true);

-- ============================================================
-- E. 17 GHL Field Mappings
-- ============================================================

INSERT INTO ghl_field_mappings (star_data_key, star_data_label, star_data_type, ghl_custom_field_id) VALUES
('audio_url', 'Audio Output URL', 'url', NULL),
('pdf_url', 'PDF Output URL', 'url', NULL),
('q1_message', 'Q1 — Core Message', 'text', NULL),
('q2_audience', 'Q2 — Audience', 'text', NULL),
('q3_outcome', 'Q3 — Desired Outcome', 'text', NULL),
('q4_story', 'Q4 — Personal Story', 'text', NULL),
('q5_lesson', 'Q5 — Lesson Learned', 'text', NULL),
('q6_signature', 'Q6 — Signature Line', 'text', NULL),
('q7_hook', 'Q7 — Hook Style', 'text', NULL),
('q8_cta', 'Q8 — Call to Action', 'text', NULL),
('q9_exit', 'Q9 — Closing Tagline', 'text', NULL),
('q10_context', 'Q10 — Tone/Context', 'text', NULL),
('generation_status', 'Generation Status', 'text', NULL),
('generated_at', 'Generation Date', 'date', NULL),
('word_count', 'Word Count', 'number', NULL),
('voice_used', 'Voice Used', 'text', NULL),
('speech_id', 'Speech ID', 'text', NULL);