-- Add display_count to pool_config so admins can set a fake signup number on the waiting page
ALTER TABLE pool_config ADD COLUMN IF NOT EXISTS display_count INTEGER NOT NULL DEFAULT 0;
