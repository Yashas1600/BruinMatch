-- Add dating_pool column to profiles table
ALTER TABLE profiles
ADD COLUMN dating_pool TEXT NOT NULL DEFAULT 'default';

-- Create index on dating_pool for faster filtering
CREATE INDEX idx_profiles_dating_pool ON profiles(dating_pool);

-- Update the RLS policies if needed (they should still work with the new column)
-- The existing policies will continue to work since they don't explicitly restrict dating_pool
