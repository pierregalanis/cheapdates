-- Follows: user A follows user B
CREATE TABLE IF NOT EXISTS follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_select_public') THEN
    EXECUTE $p$ CREATE POLICY "follows_select_public" ON follows FOR SELECT USING (true) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_insert_own') THEN
    EXECUTE $p$ CREATE POLICY "follows_insert_own" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_delete_own') THEN
    EXECUTE $p$ CREATE POLICY "follows_delete_own" ON follows FOR DELETE USING (auth.uid() = follower_id) $p$;
  END IF;
END; $$;

-- Fast lookups: who am I following? who follows me?
CREATE INDEX IF NOT EXISTS follows_follower_id_idx  ON follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows (following_id);
