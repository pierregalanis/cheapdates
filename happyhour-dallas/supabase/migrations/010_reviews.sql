-- Add photo_urls to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- Helpful votes table (one row per user per review)
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='review_helpful_votes' AND policyname='helpful_votes_select_public') THEN
    EXECUTE $p$ CREATE POLICY "helpful_votes_select_public" ON review_helpful_votes FOR SELECT USING (true) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='review_helpful_votes' AND policyname='helpful_votes_insert_own') THEN
    EXECUTE $p$ CREATE POLICY "helpful_votes_insert_own" ON review_helpful_votes FOR INSERT WITH CHECK (auth.uid() = user_id) $p$;
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='review_helpful_votes' AND policyname='helpful_votes_delete_own') THEN
    EXECUTE $p$ CREATE POLICY "helpful_votes_delete_own" ON review_helpful_votes FOR DELETE USING (auth.uid() = user_id) $p$;
  END IF;
END; $$;

-- Allow restaurant owners to set restaurant_reply on their reviews
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='reviews_update_owner_reply') THEN
    EXECUTE $p$
      CREATE POLICY "reviews_update_owner_reply" ON reviews FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM restaurants r WHERE r.id = reviews.restaurant_id AND r.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM restaurants r WHERE r.id = reviews.restaurant_id AND r.owner_id = auth.uid()
        )
      )
    $p$;
  END IF;
END; $$;

-- Atomic helpful_count helpers (SECURITY DEFINER bypasses RLS for the counter)
CREATE OR REPLACE FUNCTION increment_helpful_count(p_review_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_helpful_count(p_review_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = p_review_id;
END;
$$;

-- NOTE: Create a public bucket named "review-photos" in Supabase Dashboard > Storage.
--       Enable public access so getPublicUrl() works without a signed URL.
