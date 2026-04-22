-- ============================================================
-- STAR App: Add api_key_preview and is_configured to openrouter_integration
-- W3-08: Support admin config endpoint
-- ============================================================

ALTER TABLE openrouter_integration
  ADD COLUMN IF NOT EXISTS api_key_preview TEXT,
  ADD COLUMN IF NOT EXISTS is_configured BOOLEAN NOT NULL DEFAULT false;

-- Set is_configured = true for any existing row that already has an encrypted key
UPDATE openrouter_integration
SET is_configured = true,
    api_key_preview = '****'
WHERE api_key_encrypted IS NOT NULL;