-- ============================================================
-- STAR App: Fish Audio Integration Config
-- Adds a singleton table for Fish Audio API key storage
-- ============================================================

-- Fish Audio integration: singleton config for Fish Audio TTS API
CREATE TABLE IF NOT EXISTS fish_audio_integration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_encrypted TEXT,
  api_key_preview TEXT,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  last_validation_status TEXT,
  last_validation_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton pattern: only one Fish Audio integration row
CREATE UNIQUE INDEX IF NOT EXISTS fish_audio_integration_singleton ON fish_audio_integration ((true));

-- RLS
ALTER TABLE fish_audio_integration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on fish_audio_integration"
  ON fish_audio_integration FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Block non-admin select on fish_audio_integration"
  ON fish_audio_integration FOR SELECT
  TO anon, authenticated
  USING (false);

-- Updated at trigger
CREATE TRIGGER fish_audio_integration_updated_at
  BEFORE UPDATE ON fish_audio_integration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();