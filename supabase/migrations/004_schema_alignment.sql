-- ============================================================
-- STAR App: Schema Alignment Migration
-- W6-FIX-1: Align database column names with app code
-- ============================================================

-- Rename speeches columns to match app usage
ALTER TABLE speeches RENAME COLUMN user_first_name TO first_name;
ALTER TABLE speeches RENAME COLUMN user_last_name TO last_name;
ALTER TABLE speeches RENAME COLUMN user_email TO email;
ALTER TABLE speeches RENAME COLUMN user_phone TO phone;

-- Rename ghl_integration column
ALTER TABLE ghl_integration RENAME COLUMN private_integration_token_encrypted TO pit_encrypted;

-- Add new columns to ghl_integration
ALTER TABLE ghl_integration ADD COLUMN IF NOT EXISTS pit_preview TEXT;
ALTER TABLE ghl_integration ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT false;
ALTER TABLE ghl_integration ADD COLUMN IF NOT EXISTS workflow_id TEXT;
ALTER TABLE ghl_integration ADD COLUMN IF NOT EXISTS trigger_event TEXT;

-- Add column to ghl_field_mappings
ALTER TABLE ghl_field_mappings ADD COLUMN IF NOT EXISTS location_id TEXT;

-- Rename ghl_field_mappings column
ALTER TABLE ghl_field_mappings RENAME COLUMN star_data_key TO star_app_field;

-- Drop unused columns from ghl_field_mappings
ALTER TABLE ghl_field_mappings DROP COLUMN IF EXISTS star_data_label;
ALTER TABLE ghl_field_mappings DROP COLUMN IF EXISTS star_data_type;

-- Add ghl_custom_field_id column if not present (should exist from initial schema, but ensuring)
-- This is a no-op if the column already exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ghl_field_mappings' AND column_name = 'ghl_custom_field_id'
  ) THEN
    ALTER TABLE ghl_field_mappings ADD COLUMN ghl_custom_field_id TEXT;
  END IF;
END $$;

-- Make phone mandatory (NOT NULL) - user request 2026-04-22
ALTER TABLE speeches ALTER COLUMN phone SET NOT NULL;