-- ============================================================
-- STAR App: Fish Audio Integration Extended Columns
-- Adds missing columns referenced by the application code
-- that were not included in migration 005_fish_audio_config.sql
-- ============================================================

ALTER TABLE fish_audio_integration ADD COLUMN IF NOT EXISTS default_voice_id TEXT;
ALTER TABLE fish_audio_integration ADD COLUMN IF NOT EXISTS tts_model TEXT DEFAULT 's2.1-pro';
ALTER TABLE fish_audio_integration ADD COLUMN IF NOT EXISTS volume NUMERIC DEFAULT 0;
ALTER TABLE fish_audio_integration ADD COLUMN IF NOT EXISTS speed NUMERIC DEFAULT 1.0;
ALTER TABLE fish_audio_integration ADD COLUMN IF NOT EXISTS loudness_normalization BOOLEAN DEFAULT true;
ALTER TABLE fish_audio_integration ADD COLUMN IF NOT EXISTS text_normalization BOOLEAN DEFAULT false;
