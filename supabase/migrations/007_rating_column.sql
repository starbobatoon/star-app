-- ============================================================
-- STAR App: Rating System Migration
-- Adds 1-4 star rating to completed speeches
-- ============================================================

ALTER TABLE speeches ADD COLUMN IF NOT EXISTS rating INT CHECK (rating BETWEEN 1 AND 4);
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS rating_comment TEXT;
