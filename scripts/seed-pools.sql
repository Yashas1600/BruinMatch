-- Seed pool codes: pfc123 and test.
-- Run this in Supabase Dashboard → SQL Editor if you haven't run migration 005.
-- (If using Supabase CLI: migrations are applied with `supabase db push`)

-- Ensure pool_config table exists (from migration 004)
CREATE TABLE IF NOT EXISTS pool_config (
  pool_code TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pool_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pool_config" ON pool_config;
CREATE POLICY "Anyone can read pool_config"
  ON pool_config FOR SELECT
  USING (true);

-- Seed the two pools: pfc123 = waiting (admin hasn't started), test = active
INSERT INTO pool_config (pool_code, status)
VALUES
  ('pfc123', 'waiting'),
  ('test', 'active')
ON CONFLICT (pool_code) DO UPDATE SET status = EXCLUDED.status;
