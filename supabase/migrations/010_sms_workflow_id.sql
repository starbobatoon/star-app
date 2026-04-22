-- ============================================================
-- 010_sms_workflow_id.sql
-- Adds sms_workflow_id column to ghl_integration table.
-- ============================================================

ALTER TABLE ghl_integration
  ADD COLUMN IF NOT EXISTS sms_workflow_id TEXT;

COMMENT ON COLUMN ghl_integration.sms_workflow_id IS
  'GoHighLevel workflow ID triggered for SMS delivery after speech generation.';
