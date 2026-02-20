-- Seed pools pfc123 and test. pfc123 = not started yet; test = active so you can try matching.
INSERT INTO pool_config (pool_code, status)
VALUES
  ('pfc123', 'waiting'),
  ('test', 'active')
ON CONFLICT (pool_code) DO UPDATE SET status = EXCLUDED.status;
