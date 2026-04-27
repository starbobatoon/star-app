-- OpenRouter configuration table
CREATE TABLE IF NOT EXISTS openrouter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_encrypted TEXT,
  api_key_preview TEXT,
  is_configured BOOLEAN DEFAULT false,
  primary_model_id TEXT DEFAULT 'anthropic/claude-sonnet-4-6',
  primary_temperature DECIMAL(3,2) DEFAULT 0.7,
  primary_max_tokens INTEGER DEFAULT 4096,
  brainstorm_model_id TEXT DEFAULT 'google/gemini-3.1-flash-lite-preview',
  brainstorm_temperature DECIMAL(3,2) DEFAULT 1.2,
  brainstorm_max_tokens INTEGER DEFAULT 2048,
  brainstorm_use_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE openrouter_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON openrouter_config FOR ALL USING (true) WITH CHECK (true);

-- Fish Audio configuration table
CREATE TABLE IF NOT EXISTS fish_audio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_encrypted TEXT,
  api_key_preview TEXT,
  voice_id TEXT DEFAULT 'e75e1618ff544059be71409c5126b4c0',
  voice_name TEXT DEFAULT 'Stefan',
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fish_audio_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON fish_audio_config FOR ALL USING (true) WITH CHECK (true);
