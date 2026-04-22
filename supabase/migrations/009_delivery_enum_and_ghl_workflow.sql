-- ============================================================
-- 009_delivery_enum_and_ghl_workflow.sql
-- Adds delivery_status enum to speeches table and
-- ghl_workflow_id to ghl_integration table.
-- ============================================================

-- Create delivery_status enum type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'delivery_status_enum'
  ) THEN
    CREATE TYPE delivery_status_enum AS ENUM (
      'pending',
      'sent_email',
      'sent_sms',
      'failed_email',
      'failed_sms',
      'completed'
    );
  END IF;
END $$;

-- Add delivery_status enum column to speeches table
-- (Distinct from the JSONB delivery_status added in 006 which tracks
--  detailed per-channel results. This enum provides a simple queryable
--  overall delivery state.)
ALTER TABLE speeches
  ADD COLUMN IF NOT EXISTS delivery_status_enum delivery_status_enum
  NOT NULL DEFAULT 'pending';

-- Add index for filtering by delivery status
CREATE INDEX IF NOT EXISTS idx_speeches_delivery_status_enum
  ON speeches (delivery_status_enum);

-- Add ghl_workflow_id column to ghl_integration table
ALTER TABLE ghl_integration
  ADD COLUMN IF NOT EXISTS ghl_workflow_id TEXT;

-- Add comment explaining ghl_workflow_id
COMMENT ON COLUMN ghl_integration.ghl_workflow_id IS
  'GoHighLevel workflow ID triggered after speech generation for email/SMS delivery.';
