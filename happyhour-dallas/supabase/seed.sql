-- HappyHour Dallas — Seed Data
-- Run in Supabase SQL Editor (service role — bypasses RLS)
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING

-- ─── Restaurants ──────────────────────────────────────────────────────────────

INSERT INTO restaurants (
  id, name, slug, description, address, neighborhood, zip_code,
  latitude, longitude, phone, website, cuisine_type, vibe_tags,
  status, is_verified, subscription_tier, crowd_level,
  average_rating, review_count
) VALUES
  (
    '11111111-1111-1111-1111-000000000001',
    'Bottled Blonde', 'bottled-blonde',
    'Uptown''s premier rooftop cocktail bar with panoramic city views and an electric atmosphere.',
    '2724 Elm St, Dallas, TX 75204', 'Uptown', '75204',
    32.79850, -96.80130, '(214) 555-0181', 'bottledblonde.com',
    'Cocktail Bar', ARRAY['Rooftop', 'Date Night', 'Upscale', 'City Views'],
    'approved', true, 'elite', 3, 4.60, 284
  ),
  (
    '11111111-1111-1111-1111-000000000002',
    'Happiest Hour', 'happiest-hour',
    'Dallas''s beloved sports bar and beer garden with over 300 taps and legendary happy hour prices.',
    '2616 Elm St, Dallas, TX 75204', 'Uptown', '75204',
    32.79920, -96.80200, '(214) 555-0182', 'happiesthour.com',
    'Sports Bar', ARRAY['Sports Bar', 'Beer Garden', 'Lively', 'Dog Friendly'],
    'approved', true, 'pro', 4, 4.80, 512
  ),
  (
    '11111111-1111-1111-1111-000000000003',
    'Off the Record', 'off-the-record',
    'Deep Ellum''s coolest dive bar with craft cocktails, live music, and vinyl on the jukebox.',
    '316 Main St, Dallas, TX 75226', 'Deep Ellum', '75226',
    32.78290, -96.79340, '(214) 555-0183', 'offtherecorddallas.com',
    'Cocktail Bar', ARRAY['Live Music', 'Cocktails', 'Dive Bar', 'Artsy'],
    'approved', true, 'verified', 2, 4.40, 178
  ),
  (
    '11111111-1111-1111-1111-000000000004',
    'The Rustic', 'the-rustic',
    'Massive outdoor biergarten with live music every weekend, a dog-friendly patio, and Texas comfort food.',
    '3656 Howell St, Dallas, TX 75204', 'Design District', '75204',
    32.80440, -96.82110, '(214) 555-0184', 'therustic.com',
    'American', ARRAY['Patio', 'Dog Friendly', 'Live Music', 'Outdoor'],
    'approved', true, 'elite', 2, 4.50, 391
  ),
  (
    '11111111-1111-1111-1111-000000000005',
    'Common Table', 'common-table',
    'A beloved Uptown neighborhood bar known for its exceptional craft beer selection and welcoming vibe.',
    '2917 Fairmount St, Dallas, TX 75201', 'Uptown', '75201',
    32.80020, -96.80610, '(214) 555-0185', 'commontabledallas.com',
    'Craft Beer Bar', ARRAY['Craft Beer', 'Quiet & Cozy', 'Neighborhood', 'Gastropub'],
    'approved', false, 'basic', 1, 4.30, 156
  ),
  (
    '11111111-1111-1111-1111-000000000006',
    'Taco y Vino', 'taco-y-vino',
    'Oak Cliff''s favorite Mexican wine bar fusing street tacos with an impressive natural wine list.',
    '222 W Davis St, Dallas, TX 75208', 'Oak Cliff', '75208',
    32.74860, -96.82700, '(214) 555-0186', 'tacoyvino.com',
    'Mexican', ARRAY['Date Night', 'Wine Bar', 'Tacos', 'Trendy'],
    'approved', true, 'pro', 2, 4.70, 223
  ),
  (
    '11111111-1111-1111-1111-000000000007',
    'Concrete Cowboy', 'concrete-cowboy',
    'Deep Ellum''s hottest rooftop bar blending Texas honky-tonk soul with craft cocktail culture.',
    '2303 Commerce St, Dallas, TX 75226', 'Deep Ellum', '75226',
    32.78310, -96.79580, '(214) 555-0187', 'concretecowboydallas.com',
    'Cocktail Bar', ARRAY['Rooftop', 'Lively', 'Country', 'Trendy'],
    'approved', true, 'pro', 3, 4.50, 198
  ),
  (
    '11111111-1111-1111-1111-000000000008',
    'The Press Box', 'the-press-box',
    'Knox-Henderson''s go-to sports bar with a buzzing patio, killer food menu, and daily happy hour specials.',
    '3025 Routh St, Dallas, TX 75201', 'Knox-Henderson', '75201',
    32.80680, -96.80260, '(214) 555-0188', 'thepressboxdallas.com',
    'Sports Bar', ARRAY['Sports Bar', 'Patio', 'Lively', 'Food + Drinks'],
    'approved', false, 'verified', 2, 4.20, 147
  ),
  (
    '11111111-1111-1111-1111-000000000009',
    'Plonk Beer & Wine',  'plonk-beer-wine',
    'Greenville Ave''s cozy neighborhood wine bar and bottle shop — perfect for a mellow happy hour.',
    '6885 Lovers Ln, Dallas, TX 75225', 'Greenville', '75225',
    32.86140, -96.78880, '(214) 555-0189', 'plonkdallas.com',
    'Wine Bar', ARRAY['Wine Bar', 'Quiet & Cozy', 'Date Night', 'Intimate'],
    'approved', true, 'verified', 1, 4.60, 203
  ),
  (
    '11111111-1111-1111-1111-000000000010',
    'Parliament', 'parliament',
    'Cocktail bar and late-night social club in the heart of Deep Ellum with inventive seasonal menus.',
    '2800 Main St, Dallas, TX 75226', 'Deep Ellum', '75226',
    32.78260, -96.79780, '(214) 555-0190', 'parliamentdallas.com',
    'Cocktail Bar', ARRAY['Craft Cocktails', 'Late Night', 'Artsy', 'Date Night'],
    'approved', true, 'pro', 2, 4.55, 267
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Happy Hours ──────────────────────────────────────────────────────────────
-- day_of_week: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat

INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT r, d, '15:00', '19:00', 'Weekday Happy Hour', true
FROM (VALUES ('11111111-1111-1111-1111-000000000001'::uuid)) AS t(r)
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000001', d, '12:00', '17:00', 'Weekend Happy Hour', true
FROM (VALUES (0),(6)) AS days(d)
ON CONFLICT DO NOTHING;

-- Happiest Hour — Mon-Fri 3-7, Sat-Sun 12-6
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000002', d, '15:00', '19:00', 'Weekday Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000002', d, '12:00', '18:00', 'Weekend Happy Hour', true
FROM (VALUES (0),(6)) AS days(d)
ON CONFLICT DO NOTHING;

-- Off the Record — Mon-Fri 4-8, Sat 2-6
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000003', d, '16:00', '20:00', 'Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
VALUES ('11111111-1111-1111-1111-000000000003', 6, '14:00', '18:00', 'Saturday Happy Hour', true)
ON CONFLICT DO NOTHING;

-- The Rustic — Mon-Fri 4-7, Sat-Sun 11-3
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000004', d, '16:00', '19:00', 'Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000004', d, '11:00', '15:00', 'Brunch Happy Hour', true
FROM (VALUES (0),(6)) AS days(d)
ON CONFLICT DO NOTHING;

-- Common Table — Mon-Fri 3-7
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000005', d, '15:00', '19:00', 'Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

-- Taco y Vino — Mon-Fri 3-6, Sat 12-5
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000006', d, '15:00', '18:00', 'Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
VALUES ('11111111-1111-1111-1111-000000000006', 6, '12:00', '17:00', 'Saturday Happy Hour', true)
ON CONFLICT DO NOTHING;

-- Concrete Cowboy — Mon-Fri 4-7
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000007', d, '16:00', '19:00', 'Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

-- The Press Box — Mon-Fri 3-7, Sat 11-4
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000008', d, '15:00', '19:00', 'Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
VALUES ('11111111-1111-1111-1111-000000000008', 6, '11:00', '16:00', 'Saturday Happy Hour', true)
ON CONFLICT DO NOTHING;

-- Plonk — Mon-Sun 3-6
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000009', d, '15:00', '18:00', 'Happy Hour', true
FROM (VALUES (0),(1),(2),(3),(4),(5),(6)) AS days(d)
ON CONFLICT DO NOTHING;

-- Parliament — Mon-Fri 4-7
INSERT INTO happy_hours (restaurant_id, day_of_week, start_time, end_time, label, is_active)
SELECT '11111111-1111-1111-1111-000000000010', d, '16:00', '19:00', 'Happy Hour', true
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
ON CONFLICT DO NOTHING;

-- ─── Menu Items ───────────────────────────────────────────────────────────────

INSERT INTO menu_items (restaurant_id, category, name, regular_price, happy_hour_price, is_featured, is_available)
VALUES
  -- Bottled Blonde
  ('11111111-1111-1111-1111-000000000001', 'Drinks', 'Signature Cocktails',  14.00,  5.00, true,  true),
  ('11111111-1111-1111-1111-000000000001', 'Drinks', 'Draft Beer',            8.00,  4.00, false, true),
  ('11111111-1111-1111-1111-000000000001', 'Drinks', 'House Wine',           12.00,  6.00, false, true),
  ('11111111-1111-1111-1111-000000000001', 'Food',   'Truffle Fries',        14.00,  8.00, true,  true),
  ('11111111-1111-1111-1111-000000000001', 'Food',   'Sliders (3)',          16.00, 10.00, false, true),

  -- Happiest Hour
  ('11111111-1111-1111-1111-000000000002', 'Drinks', 'Domestic Beer',         7.00,  3.00, true,  true),
  ('11111111-1111-1111-1111-000000000002', 'Drinks', 'Well Drinks',           9.00,  5.00, false, true),
  ('11111111-1111-1111-1111-000000000002', 'Drinks', 'Craft Beer Pint',      10.00,  6.00, false, true),
  ('11111111-1111-1111-1111-000000000002', 'Food',   'Loaded Nachos',        13.00,  8.00, true,  true),
  ('11111111-1111-1111-1111-000000000002', 'Food',   'Wings (10)',            15.00,  9.00, false, true),

  -- Off the Record
  ('11111111-1111-1111-1111-000000000003', 'Drinks', 'Craft Cocktails',      14.00,  6.00, true,  true),
  ('11111111-1111-1111-1111-000000000003', 'Drinks', 'House Wine',           11.00,  4.00, false, true),
  ('11111111-1111-1111-1111-000000000003', 'Drinks', 'Draft Beer',            8.00,  4.00, false, true),
  ('11111111-1111-1111-1111-000000000003', 'Food',   'Charcuterie Board',    18.00, 11.00, true,  true),

  -- The Rustic
  ('11111111-1111-1111-1111-000000000004', 'Drinks', 'Margaritas',           13.00,  5.00, true,  true),
  ('11111111-1111-1111-1111-000000000004', 'Drinks', 'Lone Star Draft',       7.00,  4.00, false, true),
  ('11111111-1111-1111-1111-000000000004', 'Drinks', 'Wine by the Glass',    11.00,  6.00, false, true),
  ('11111111-1111-1111-1111-000000000004', 'Food',   'Queso & Chips',        12.00,  8.00, true,  true),
  ('11111111-1111-1111-1111-000000000004', 'Food',   'Pretzel Bites',        10.00,  7.00, false, true),

  -- Common Table
  ('11111111-1111-1111-1111-000000000005', 'Drinks', 'Draft Beer (any)',       8.00,  6.00, true,  true),
  ('11111111-1111-1111-1111-000000000005', 'Drinks', 'House Wine',           10.00,  6.00, false, true),
  ('11111111-1111-1111-1111-000000000005', 'Food',   'Soft Pretzel',          9.00,  6.00, false, true),

  -- Taco y Vino
  ('11111111-1111-1111-1111-000000000006', 'Drinks', 'Margaritas',           12.00,  5.00, true,  true),
  ('11111111-1111-1111-1111-000000000006', 'Drinks', 'Natural Wine Glass',   13.00,  7.00, false, true),
  ('11111111-1111-1111-1111-000000000006', 'Food',   'Street Tacos (3)',     12.00,  7.00, true,  true),
  ('11111111-1111-1111-1111-000000000006', 'Food',   'Guacamole & Chips',    10.00,  6.00, false, true),

  -- Concrete Cowboy
  ('11111111-1111-1111-1111-000000000007', 'Drinks', 'Whiskey Cocktails',    14.00,  6.00, true,  true),
  ('11111111-1111-1111-1111-000000000007', 'Drinks', 'Lone Star Longneck',    6.00,  3.00, false, true),
  ('11111111-1111-1111-1111-000000000007', 'Food',   'Brisket Sliders',      14.00,  8.00, true,  true),

  -- The Press Box
  ('11111111-1111-1111-1111-000000000008', 'Drinks', 'Draft Beer',            7.00,  3.00, true,  true),
  ('11111111-1111-1111-1111-000000000008', 'Drinks', 'Well Drinks',           9.00,  4.00, false, true),
  ('11111111-1111-1111-1111-000000000008', 'Food',   'Basket of Fries',       8.00,  5.00, false, true),
  ('11111111-1111-1111-1111-000000000008', 'Food',   'Flatbread Pizza',      12.00,  7.00, true,  true),

  -- Plonk
  ('11111111-1111-1111-1111-000000000009', 'Drinks', 'Wine by the Glass',    14.00,  7.00, true,  true),
  ('11111111-1111-1111-1111-000000000009', 'Drinks', 'Craft Beer',            8.00,  5.00, false, true),
  ('11111111-1111-1111-1111-000000000009', 'Food',   'Cheese Board',         16.00, 10.00, true,  true),

  -- Parliament
  ('11111111-1111-1111-1111-000000000010', 'Drinks', 'Seasonal Cocktails',   15.00,  7.00, true,  true),
  ('11111111-1111-1111-1111-000000000010', 'Drinks', 'Draft Beer',            8.00,  4.00, false, true),
  ('11111111-1111-1111-1111-000000000010', 'Drinks', 'House Spritz',         12.00,  6.00, false, true),
  ('11111111-1111-1111-1111-000000000010', 'Food',   'Charcuterie',          17.00, 10.00, true,  true)
ON CONFLICT DO NOTHING;
