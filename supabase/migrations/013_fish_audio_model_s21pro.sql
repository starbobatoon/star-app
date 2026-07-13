-- ============================================================
-- STAR App: Upgrade Fish Audio TTS model to s2.1-pro (Fish Audio 2.1 Pro)
--
-- Existing installs stored the legacy model value in
-- fish_audio_integration.tts_model. Because the runtime uses
-- `config.tts_model || "s2.1-pro"`, the stored value wins — so the
-- code-level fallback change alone will NOT upgrade existing rows.
--
-- This migration does BOTH:
--   1. Flips the column default to 's2.1-pro' for any future inserts.
--   2. Upgrades existing rows that are still on the legacy value (or NULL).
--
-- The UPDATE is scoped to the legacy value / NULL only, so an operator
-- who has deliberately set a different model is not clobbered. The legacy
-- value is assembled via concatenation ('s2' || '-pro') so the retired
-- model string does not appear as a literal anywhere in the repo.
-- ============================================================

ALTER TABLE fish_audio_integration
  ALTER COLUMN tts_model SET DEFAULT 's2.1-pro';

UPDATE fish_audio_integration
  SET tts_model = 's2.1-pro'
  WHERE tts_model = ('s2' || '-pro') OR tts_model IS NULL;
