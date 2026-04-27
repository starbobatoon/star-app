-- Fix model_slots to use valid OpenRouter model IDs.
-- The original seed (002_seed_data.sql) used 'google/gemini-3-pro' which does
-- not exist on OpenRouter. Update to claude-sonnet-4-6 (primary) and
-- gemini-3.1-flash-lite-preview (brainstorm) which are the correct slugs.

UPDATE model_slots
SET
  model_id = 'anthropic/claude-sonnet-4-6',
  label    = 'Claude Sonnet 4.6 (Primary)',
  max_output_tokens = 4096
WHERE slot = 'primary'
  AND model_id = 'google/gemini-3-pro';

UPDATE model_slots
SET
  model_id = 'google/gemini-3.1-flash-lite-preview',
  label    = 'Gemini 3.1 Flash Lite (Brainstorm)',
  max_output_tokens = 2048
WHERE slot = 'brainstorm'
  AND model_id = 'google/gemini-2.5-flash';

-- Unconditional fallback: if neither slot exists yet, insert them.
INSERT INTO model_slots (slot, model_id, label, temperature, max_output_tokens)
VALUES
  ('primary',    'anthropic/claude-sonnet-4-6',            'Claude Sonnet 4.6 (Primary)',            0.70, 4096),
  ('brainstorm', 'google/gemini-3.1-flash-lite-preview',   'Gemini 3.1 Flash Lite (Brainstorm)',     0.80, 2048)
ON CONFLICT (slot) DO NOTHING;
