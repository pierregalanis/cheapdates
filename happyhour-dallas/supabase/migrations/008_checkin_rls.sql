-- RLS policies for user_badges, passport_stamps, checkins
-- Run in Supabase SQL Editor

-- ─── user_badges ──────────────────────────────────────────────────────────────

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'user_badges_select_own') THEN
    EXECUTE $p$ CREATE POLICY "user_badges_select_own" ON user_badges FOR SELECT USING (user_id = auth.uid()) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'Users can insert own badges') THEN
    EXECUTE $p$ CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (user_id = auth.uid()) $p$;
  END IF;
END; $$;

-- ─── passport_stamps ─────────────────────────────────────────────────────────

ALTER TABLE passport_stamps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'passport_stamps' AND policyname = 'passport_stamps_select_own') THEN
    EXECUTE $p$ CREATE POLICY "passport_stamps_select_own" ON passport_stamps FOR SELECT USING (user_id = auth.uid()) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'passport_stamps' AND policyname = 'passport_stamps_insert_own') THEN
    EXECUTE $p$ CREATE POLICY "passport_stamps_insert_own" ON passport_stamps FOR INSERT WITH CHECK (user_id = auth.uid()) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'passport_stamps' AND policyname = 'passport_stamps_update_own') THEN
    EXECUTE $p$ CREATE POLICY "passport_stamps_update_own" ON passport_stamps FOR UPDATE USING (user_id = auth.uid()) $p$;
  END IF;
END; $$;

-- ─── checkins ────────────────────────────────────────────────────────────────

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'checkins_select_own') THEN
    EXECUTE $p$ CREATE POLICY "checkins_select_own" ON checkins FOR SELECT USING (user_id = auth.uid()) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'checkins_insert_own') THEN
    EXECUTE $p$ CREATE POLICY "checkins_insert_own" ON checkins FOR INSERT WITH CHECK (user_id = auth.uid()) $p$;
  END IF;
END; $$;

-- ─── Unique constraint on passport_stamps ────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'passport_stamps_user_neighborhood_unique'
  ) THEN
    ALTER TABLE passport_stamps
      ADD CONSTRAINT passport_stamps_user_neighborhood_unique UNIQUE (user_id, neighborhood);
  END IF;
END; $$;
