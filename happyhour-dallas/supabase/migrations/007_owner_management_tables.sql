-- Owner management tables: menu_items and deals
-- Run in Supabase SQL Editor

-- ─── Menu Items ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'Other',
  regular_price   numeric(8, 2),
  happy_hour_price numeric(8, 2),
  is_available    boolean NOT NULL DEFAULT true,
  is_featured     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read menu items for approved restaurants
CREATE POLICY "menu_items_select_public" ON menu_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = menu_items.restaurant_id
        AND r.status = 'approved'
    )
  );

-- Only the restaurant owner can insert/update/delete
CREATE POLICY "menu_items_owner_write" ON menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

-- ─── Deals ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  discount_type   text NOT NULL DEFAULT 'other'
                    CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'free_item', 'other')),
  discount_value  numeric(8, 2),
  min_purchase    numeric(8, 2),
  valid_days      integer[],         -- 0=Sun … 6=Sat, NULL = every day
  start_time      time,
  end_time        time,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Anyone can read active deals for approved restaurants
CREATE POLICY "deals_select_public" ON deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = deals.restaurant_id
        AND r.status = 'approved'
    )
  );

-- Only the restaurant owner can insert/update/delete
CREATE POLICY "deals_owner_write" ON deals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = deals.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

-- ─── Happy Hours RLS (if not already set) ─────────────────────────────────────

-- If happy_hours table exists without RLS, add policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'happy_hours') THEN
    ALTER TABLE happy_hours ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'happy_hours' AND policyname = 'happy_hours_select_public'
    ) THEN
      EXECUTE $p$
        CREATE POLICY "happy_hours_select_public" ON happy_hours
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM restaurants r
              WHERE r.id = happy_hours.restaurant_id AND r.status = 'approved'
            )
          )
      $p$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'happy_hours' AND policyname = 'happy_hours_owner_write'
    ) THEN
      EXECUTE $p$
        CREATE POLICY "happy_hours_owner_write" ON happy_hours
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM restaurants r
              WHERE r.id = happy_hours.restaurant_id AND r.owner_id = auth.uid()
            )
          )
      $p$;
    END IF;
  END IF;
END;
$$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS deals_restaurant_idx ON deals(restaurant_id);

-- ─── Updated-at triggers ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS menu_items_updated_at ON menu_items;
CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS deals_updated_at ON deals;
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
