-- ============================================================
-- STAR App: Fish Audio Config — Add Voice/Audio Settings Columns
-- Adds missing columns for voice ID, TTS model, volume, speed,
-- and normalization toggles to fish_audio_integration table.
-- ============================================================

-- Add default_voice_id column
ALTER TABLE fish_audio_integration
  ADD COLUMN IF NOT EXISTS default_voice_id TEXT;

-- Add tts_model column with default
ALTER TABLE fish_audio_integration
  ADD COLUMN IF NOT EXISTS tts_model TEXT DEFAULT 's2-pro';

-- Add volume adjustment column
ALTER TABLE fish_audio_integration
  ADD COLUMN IF NOT EXISTS volume NUMERIC DEFAULT 0;

-- Add speed adjustment column
ALTER TABLE fish_audio_integration
  ADD COLUMN IF NOT EXISTS speed NUMERIC DEFAULT 1.0;

-- Add loudness normalization toggle
ALTER TABLE fish_audio_integration
  ADD COLUMN IF NOT EXISTS loudness_normalization BOOLEAN DEFAULT true;

-- Add text normalization toggle
ALTER TABLE fish_audio_integration
  ADD COLUMN IF NOT EXISTS text_normalization BOOLEAN DEFAULT false;
