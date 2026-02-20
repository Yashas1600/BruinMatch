-- Pool config: one row per pool code. Controls whether matching is open.
CREATE TABLE pool_config (
  pool_code TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow anyone to read pool status (so users can see "matching paused" / signup count)
CREATE POLICY "Anyone can read pool_config"
  ON pool_config FOR SELECT
  USING (true);

-- Only service role can insert/update (admin actions use service role)
-- No INSERT/UPDATE policy for anon/authenticated = only service role can write
ALTER TABLE pool_config ENABLE ROW LEVEL SECURITY;

-- Seed the formal pool
INSERT INTO pool_config (pool_code, status)
VALUES ('POOLPFC26Y', 'waiting')
ON CONFLICT (pool_code) DO NOTHING;
