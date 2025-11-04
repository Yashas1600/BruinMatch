-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE gender_preference AS ENUM ('men', 'women', 'everyone');
CREATE TYPE swipe_decision AS ENUM ('like', 'pass');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  frat TEXT NOT NULL,
  height_cm INTEGER NOT NULL CHECK (height_cm >= 100 AND height_cm <= 250),
  interested_in gender_preference NOT NULL,
  one_liner TEXT NOT NULL CHECK (char_length(one_liner) <= 200),
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_finalized BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for query performance
CREATE INDEX idx_profiles_is_finalized ON profiles(is_finalized);
CREATE INDEX idx_profiles_frat ON profiles(frat);
CREATE INDEX idx_profiles_interested_in ON profiles(interested_in);

-- =============================================
-- PREFERENCES TABLE
-- =============================================
CREATE TABLE preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  frat_whitelist TEXT[] DEFAULT NULL,
  age_min INTEGER NOT NULL CHECK (age_min >= 18),
  age_max INTEGER NOT NULL CHECK (age_max <= 100 AND age_max >= age_min),
  height_min INTEGER NOT NULL CHECK (height_min >= 100),
  height_max INTEGER NOT NULL CHECK (height_max <= 250 AND height_max >= height_min),
  interested_in gender_preference NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- SWIPES TABLE
-- =============================================
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swipee UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  decision swipe_decision NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(swiper, swipee),
  CHECK (swiper != swipee)
);

-- Indexes for matching logic
CREATE INDEX idx_swipes_swiper ON swipes(swiper);
CREATE INDEX idx_swipes_swipee ON swipes(swipee);
CREATE INDEX idx_swipes_decision ON swipes(decision);
CREATE INDEX idx_swipes_swiper_decision ON swipes(swiper, decision);

-- =============================================
-- MATCHES TABLE
-- =============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (user_a < user_b),
  UNIQUE(user_a, user_b)
);

-- Index for querying user matches
CREATE INDEX idx_matches_user_a ON matches(user_a);
CREATE INDEX idx_matches_user_b ON matches(user_b);

-- =============================================
-- CHATS TABLE
-- =============================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_chats_match_id ON chats(match_id);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for message retrieval
CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender);

-- =============================================
-- DATE CONFIRMATIONS TABLE
-- =============================================
CREATE TABLE date_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  confirmer UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(match_id, confirmer)
);

CREATE INDEX idx_date_confirmations_match_id ON date_confirmations(match_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for preferences
CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to finalize both users when both confirm
CREATE OR REPLACE FUNCTION check_and_finalize_match()
RETURNS TRIGGER AS $$
DECLARE
  confirmation_count INTEGER;
  match_user_a UUID;
  match_user_b UUID;
BEGIN
  -- Get the count of confirmations for this match
  SELECT COUNT(*) INTO confirmation_count
  FROM date_confirmations
  WHERE match_id = NEW.match_id;

  -- If both users confirmed, finalize them
  IF confirmation_count = 2 THEN
    -- Get the users in the match
    SELECT user_a, user_b INTO match_user_a, match_user_b
    FROM matches
    WHERE id = NEW.match_id;

    -- Finalize both users
    UPDATE profiles
    SET is_finalized = TRUE
    WHERE id IN (match_user_a, match_user_b);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to finalize users after date confirmation
CREATE TRIGGER finalize_on_double_confirmation
  AFTER INSERT ON date_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION check_and_finalize_match();

-- Function to create chat when match is created
CREATE OR REPLACE FUNCTION create_chat_for_match()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chats (match_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create chat
CREATE TRIGGER auto_create_chat
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_for_match();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_confirmations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can read public profile fields of non-finalized users and their own profile
CREATE POLICY "Users can view non-finalized profiles and own profile"
  ON profiles FOR SELECT
  USING (
    is_finalized = FALSE
    OR id = auth.uid()
  );

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================
-- PREFERENCES POLICIES
-- =============================================

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON preferences FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can create own preferences"
  ON preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- SWIPES POLICIES
-- =============================================

-- Users can view their own swipes
CREATE POLICY "Users can view own swipes"
  ON swipes FOR SELECT
  USING (swiper = auth.uid());

-- Users can only insert swipes where they are the swiper
CREATE POLICY "Users can create own swipes"
  ON swipes FOR INSERT
  WITH CHECK (swiper = auth.uid());

-- =============================================
-- MATCHES POLICIES
-- =============================================

-- Users can view matches they are part of
CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- System creates matches (via function/trigger), not users directly
-- But allow insert for the backend logic
CREATE POLICY "Allow match creation"
  ON matches FOR INSERT
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- =============================================
-- CHATS POLICIES
-- =============================================

-- Users can view chats for matches they are part of
CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = chats.match_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
    )
  );

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can view messages in chats they are part of
CREATE POLICY "Users can view messages in own chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      JOIN matches ON matches.id = chats.match_id
      WHERE chats.id = messages.chat_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
    )
  );

-- Users can send messages in chats they are part of
CREATE POLICY "Users can send messages in own chats"
  ON messages FOR INSERT
  WITH CHECK (
    sender = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chats
      JOIN matches ON matches.id = chats.match_id
      WHERE chats.id = messages.chat_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
    )
  );

-- =============================================
-- DATE CONFIRMATIONS POLICIES
-- =============================================

-- Users can view confirmations for matches they are part of
CREATE POLICY "Users can view confirmations in own matches"
  ON date_confirmations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = date_confirmations.match_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
    )
  );

-- Users can confirm dates for matches they are part of
CREATE POLICY "Users can confirm own dates"
  ON date_confirmations FOR INSERT
  WITH CHECK (
    confirmer = auth.uid()
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = date_confirmations.match_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
    )
  );

-- =============================================
-- STORAGE BUCKET FOR PHOTOS
-- =============================================
-- Note: Run this in Supabase dashboard or via SQL editor:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('profile-photos', 'profile-photos', true);
--
-- CREATE POLICY "Anyone can view photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'profile-photos');
--
-- CREATE POLICY "Users can upload own photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'profile-photos'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Users can update own photos"
--   ON storage.objects FOR UPDATE
--   USING (
--     bucket_id = 'profile-photos'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Users can delete own photos"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'profile-photos'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
