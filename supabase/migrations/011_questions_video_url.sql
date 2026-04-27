-- Add video_url column to questions table so admins can attach a tutorial
-- video link to each question (shown as an expandable player on the compose page).
ALTER TABLE questions ADD COLUMN IF NOT EXISTS video_url TEXT;
