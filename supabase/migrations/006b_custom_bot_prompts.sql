-- ============================================================
-- STAR App: Add custom_prompt to model_slots
-- Support per-slot custom guiding prompts for bot personality
-- ============================================================

ALTER TABLE model_slots
  ADD COLUMN IF NOT EXISTS custom_prompt TEXT;
