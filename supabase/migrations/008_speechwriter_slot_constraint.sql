-- ============================================================
-- STAR App: Add speechwriter to model_slots slot constraint
-- The slot CHECK constraint only allowed 'primary' and 'brainstorm'.
-- This drops the old constraint and recreates it with 'speechwriter'.
-- ============================================================

ALTER TABLE model_slots
  DROP CONSTRAINT IF EXISTS model_slots_slot_check;

ALTER TABLE model_slots
  ADD CONSTRAINT model_slots_slot_check
  CHECK (slot IN ('primary', 'brainstorm', 'speechwriter'));
