-- Allow chat insertion (for trigger)
-- The trigger should bypass RLS, but this ensures proper permissions
CREATE POLICY "Allow chat creation for matches"
  ON chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
    )
  );
