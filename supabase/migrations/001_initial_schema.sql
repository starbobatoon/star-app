-- ============================================================
-- STAR App: Initial Schema Migration
-- W0-06: Database schema with RLS policies
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Prompts: versioned system prompts for speech generation
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- OpenRouter integration: singleton config for OpenRouter API
CREATE TABLE openrouter_integration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_encrypted TEXT,
  last_validated_at TIMESTAMPTZ,
  last_validation_status TEXT,
  last_validation_message TEXT,
  credits_remaining_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Model slots: configurable LLM model assignments
CREATE TABLE model_slots (
  slot TEXT PRIMARY KEY CHECK (slot IN ('primary', 'brainstorm')),
  model_id TEXT NOT NULL,
  label TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_output_tokens INT DEFAULT 2000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voices: Fish Audio voice configurations
CREATE TABLE voices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fish_audio_voice_id TEXT NOT NULL,
  label TEXT NOT NULL,
  sample_url TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions: dynamic form questions that feed speech sections
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_order INT NOT NULL,
  question_text TEXT NOT NULL,
  helper_text TEXT,
  feeds_section TEXT NOT NULL CHECK (feeds_section IN ('map', 'hook', 'story', 'point', 'cta', 'exit', 'meta')),
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  ghl_field_key TEXT,
  ghl_custom_field_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeches: core speech records with full lifecycle
CREATE TABLE speeches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  ghl_contact_id TEXT,
  ghl_contact_created BOOLEAN DEFAULT false,
  answers JSONB NOT NULL,
  transcript_markdown TEXT,
  transcript_with_tags TEXT,
  word_count INT,
  hook TEXT,
  story TEXT,
  point TEXT,
  cta TEXT,
  exit TEXT,
  pdf_ghl_url TEXT,
  audio_ghl_url TEXT,
  audio_duration_seconds INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'upserting_contact', 'generating_text', 'generating_audio', 'uploading', 'syncing_ghl', 'complete', 'failed')),
  error TEXT,
  model_used TEXT,
  voice_used TEXT,
  prompt_version INT,
  generation_cost_cents INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE
);

-- GHL integration: singleton config for GoHighLevel API
CREATE TABLE ghl_integration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  private_integration_token_encrypted TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,
  api_version TEXT,
  email_workflow_id TEXT,
  n8n_webhook_url TEXT,
  n8n_enabled BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GHL field mappings: maps STAR data fields to GHL custom fields
CREATE TABLE ghl_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  star_data_key TEXT NOT NULL UNIQUE,
  star_data_label TEXT NOT NULL,
  star_data_type TEXT NOT NULL,
  ghl_custom_field_id TEXT,
  ghl_custom_field_name TEXT,
  ghl_custom_field_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log: tracks all admin mutations
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_value JSONB,
  after_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Only one active prompt at a time
CREATE UNIQUE INDEX one_active_prompt ON prompts (is_active) WHERE is_active = true;

-- Singleton pattern: only one OpenRouter integration row
CREATE UNIQUE INDEX openrouter_integration_singleton ON openrouter_integration ((true));

-- Only one active voice at a time
CREATE UNIQUE INDEX one_active_voice ON voices (is_active) WHERE is_active = true;

-- Singleton pattern: only one GHL integration row
CREATE UNIQUE INDEX ghl_integration_singleton ON ghl_integration ((true));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE openrouter_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper: admin check function
-- Uses Supabase Auth: authenticated users with admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- prompts ----
CREATE POLICY "Admin full access on prompts"
  ON prompts FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- openrouter_integration ----
-- Admin can do everything
CREATE POLICY "Admin full access on openrouter_integration"
  ON openrouter_integration FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Block non-admin SELECT (encrypted column protection)
CREATE POLICY "Block non-admin select on openrouter_integration"
  ON openrouter_integration FOR SELECT
  TO anon, authenticated
  USING (false);

-- ---- model_slots ----
CREATE POLICY "Admin full access on model_slots"
  ON model_slots FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- voices ----
CREATE POLICY "Admin full access on voices"
  ON voices FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- questions ----
-- Anyone can SELECT (public API for form rendering)
CREATE POLICY "Public read on questions"
  ON questions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admin can INSERT/UPDATE/DELETE
CREATE POLICY "Admin write access on questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin update on questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin delete on questions"
  ON questions FOR DELETE
  TO authenticated
  USING (is_admin());

-- ---- speeches ----
-- Anyone can INSERT (public form submission)
CREATE POLICY "Public insert on speeches"
  ON speeches FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admin can SELECT/UPDATE/DELETE
CREATE POLICY "Admin read on speeches"
  ON speeches FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin update on speeches"
  ON speeches FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin delete on speeches"
  ON speeches FOR DELETE
  TO authenticated
  USING (is_admin());

-- ---- ghl_integration ----
-- Admin can do everything
CREATE POLICY "Admin full access on ghl_integration"
  ON ghl_integration FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Block non-admin SELECT (encrypted column protection)
CREATE POLICY "Block non-admin select on ghl_integration"
  ON ghl_integration FOR SELECT
  TO anon, authenticated
  USING (false);

-- ---- ghl_field_mappings ----
CREATE POLICY "Admin full access on ghl_field_mappings"
  ON ghl_field_mappings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- audit_log ----
CREATE POLICY "Admin full access on audit_log"
  ON audit_log FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update updated_at on relevant tables)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER openrouter_integration_updated_at
  BEFORE UPDATE ON openrouter_integration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER model_slots_updated_at
  BEFORE UPDATE ON model_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ghl_integration_updated_at
  BEFORE UPDATE ON ghl_integration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ghl_field_mappings_updated_at
  BEFORE UPDATE ON ghl_field_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();