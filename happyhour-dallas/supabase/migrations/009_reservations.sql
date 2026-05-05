-- Reservations table + RLS
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reservations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name        text NOT NULL,
  guest_phone       text NOT NULL,
  party_size        integer NOT NULL DEFAULT 2,
  reservation_date  date NOT NULL,
  reservation_time  time NOT NULL,
  notes             text,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show')),
  confirmation_code text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Users can read their own reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservations' AND policyname = 'reservations_select_own') THEN
    EXECUTE $p$ CREATE POLICY "reservations_select_own" ON reservations FOR SELECT USING (user_id = auth.uid()) $p$;
  END IF;
END; $$;

-- Users can insert their own reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservations' AND policyname = 'reservations_insert_own') THEN
    EXECUTE $p$ CREATE POLICY "reservations_insert_own" ON reservations FOR INSERT WITH CHECK (user_id = auth.uid()) $p$;
  END IF;
END; $$;

-- Restaurant owners can read all reservations for their restaurant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservations' AND policyname = 'reservations_select_owner') THEN
    EXECUTE $p$
      CREATE POLICY "reservations_select_owner" ON reservations
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = reservations.restaurant_id AND r.owner_id = auth.uid()
          )
        )
    $p$;
  END IF;
END; $$;

-- Restaurant owners can update status (confirm/cancel/no-show)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservations' AND policyname = 'reservations_update_owner') THEN
    EXECUTE $p$
      CREATE POLICY "reservations_update_owner" ON reservations
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = reservations.restaurant_id AND r.owner_id = auth.uid()
          )
        )
    $p$;
  END IF;
END; $$;

-- Indexes
CREATE INDEX IF NOT EXISTS reservations_restaurant_idx ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS reservations_user_idx ON reservations(user_id);
CREATE INDEX IF NOT EXISTS reservations_date_idx ON reservations(reservation_date);

-- Updated-at trigger
DROP TRIGGER IF EXISTS reservations_updated_at ON reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
