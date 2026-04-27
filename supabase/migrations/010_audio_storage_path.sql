-- Add audio_storage_path column to speeches table
-- Stores the relative path within the speech-audio Supabase storage bucket
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;
