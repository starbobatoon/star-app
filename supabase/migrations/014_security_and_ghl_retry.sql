-- ============================================================
-- 014_security_and_ghl_retry.sql
-- STAR Speaker AI security + reliability fixes (Nov 2026):
--   1. Distributed rate limiting (replaces per-instance in-memory
--      limiter that cannot work on Vercel serverless).
--   2. Durable GoHighLevel sync state on speeches so a failed
--      GHL sync is visible and retryable instead of failing
--      the speech.
--
-- Apply once in the Supabase SQL Editor (or `supabase db push`).
-- The application code is written to keep working BEFORE this
-- migration is applied (in-memory rate-limit fallback, sync
-- state recording is skipped), so deploy order does not matter.
-- ============================================================

-- ── 1. Rate limit counters ──────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) may
-- read or write rate limit state.

-- Atomically consume one point for `p_key`.
-- Returns TRUE when the request is allowed, FALSE when limited.
-- Fixed window of `p_duration_seconds`; once the point budget is
-- exhausted the key is blocked for `p_block_seconds`.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_points INT,
  p_duration_seconds INT,
  p_block_seconds INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec rate_limit_counters%ROWTYPE;
  now_ts TIMESTAMPTZ := now();
BEGIN
  INSERT INTO rate_limit_counters (key, count, window_start)
  VALUES (p_key, 0, now_ts)
  ON CONFLICT (key) DO NOTHING;

  SELECT * INTO rec FROM rate_limit_counters WHERE key = p_key FOR UPDATE;

  -- Still inside a block period
  IF rec.blocked_until IS NOT NULL AND rec.blocked_until > now_ts THEN
    RETURN FALSE;
  END IF;

  -- Window expired → start a fresh window with this request
  IF rec.window_start + make_interval(secs => p_duration_seconds) <= now_ts THEN
    UPDATE rate_limit_counters
    SET count = 1, window_start = now_ts, blocked_until = NULL, updated_at = now_ts
    WHERE key = p_key;
    RETURN TRUE;
  END IF;

  -- Budget exhausted → block
  IF rec.count >= p_points THEN
    UPDATE rate_limit_counters
    SET blocked_until = now_ts + make_interval(secs => p_block_seconds),
        updated_at = now_ts
    WHERE key = p_key;
    RETURN FALSE;
  END IF;

  UPDATE rate_limit_counters
  SET count = count + 1, updated_at = now_ts
  WHERE key = p_key;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INT, INT, INT) TO service_role;

-- ── 2. GHL sync state on speeches ───────────────────────────
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS ghl_sync_status TEXT;
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS ghl_sync_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS ghl_sync_last_error TEXT;
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS ghl_sync_next_attempt_at TIMESTAMPTZ;
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_speeches_ghl_sync_status
  ON speeches (ghl_sync_status)
  WHERE ghl_sync_status IN ('pending', 'failed');

COMMENT ON COLUMN speeches.ghl_sync_status IS
  'GoHighLevel sync outcome: pending | synced | failed | skipped. Set by ghl-sync.ts; a failed sync never fails the speech itself and can be retried via POST /api/speeches/[id]/ghl-sync/retry.';
