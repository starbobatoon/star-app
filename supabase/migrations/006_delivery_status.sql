-- ============================================================
-- 006_delivery_status.sql
-- Adds delivery_status tracking to the speeches table.
-- ============================================================

-- Add delivery_status JSONB column to track per-channel delivery results
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS delivery_status JSONB DEFAULT NULL;

-- Add index for querying delivery failures
CREATE INDEX IF NOT EXISTS idx_speeches_delivery_status
  ON speeches USING gin (delivery_status);

-- Add comment explaining the column structure
COMMENT ON COLUMN speeches.delivery_status IS
  'JSONB object tracking email and SMS delivery results. '
  'Structure: { email: { attempted, method, success, error? }, sms: { attempted, method, success, error? } }. '
  'Set by notifyOnCompletion() after pipeline completes.';
