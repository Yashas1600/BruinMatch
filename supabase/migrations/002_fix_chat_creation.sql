-- Add missing INSERT policy for chats table
-- This allows the database trigger to automatically create chats when matches are created

CREATE POLICY "Allow system to create chats for matches"
  ON chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
    )
  );
