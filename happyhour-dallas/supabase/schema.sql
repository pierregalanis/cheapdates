-- HappyHour Dallas — Full Database Schema
-- Run this in Supabase SQL Editor → New Query → paste → Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────────
-- TABLES
-- ───────────────────────────────────────────────

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  neighborhood text,
  points integer default 0,
  level text default 'Newcomer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table restaurants (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references profiles(id),
  name text not null,
  slug text unique,
  description text,
  address text not null,
  neighborhood text,
  city text default 'Dallas',
  state text default 'TX',
  zip_code text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  phone text,
  website text,
  email text,
  cuisine_type text,
  vibe_tags text[],
  logo_url text,
  photos text[],
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  is_verified boolean default false,
  subscription_tier text default 'basic' check (subscription_tier in ('basic', 'verified', 'pro', 'elite')),
  crowd_level integer default 0 check (crowd_level between 0 and 4),
  crowd_updated_at timestamptz,
  average_rating numeric(3, 2) default 0,
  review_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table happy_hours (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table menu_items (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade,
  category text not null,
  name text not null,
  description text,
  regular_price numeric(10, 2),
  happy_hour_price numeric(10, 2),
  is_featured boolean default false,
  is_available boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table reservations (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  reservation_date date not null,
  reservation_time time not null,
  party_size integer not null check (party_size > 0),
  special_requests text,
  confirmation_code text unique,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  waitlist boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table reviews (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  visit_date date,
  helpful_count integer default 0,
  is_flagged boolean default false,
  restaurant_reply text,
  restaurant_replied_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (restaurant_id, user_id)
);

create table review_photos (
  id uuid default uuid_generate_v4() primary key,
  review_id uuid references reviews(id) on delete cascade,
  photo_url text not null,
  is_approved boolean default false,
  created_at timestamptz default now()
);

create table checkins (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  points_earned integer default 10,
  created_at timestamptz default now()
);

create table passport_stamps (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  neighborhood text not null,
  created_at timestamptz default now(),
  unique (user_id, neighborhood)
);

create table user_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  badge_type text not null,
  badge_name text not null,
  earned_at timestamptz default now()
);

create table favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, restaurant_id)
);

create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table analytics_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  restaurant_id uuid references restaurants(id),
  event_type text not null,
  data jsonb,
  created_at timestamptz default now()
);

create table admin_actions (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references profiles(id),
  action_type text not null,
  target_type text,
  target_id uuid,
  notes text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table special_deals (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade,
  title text not null,
  description text,
  deal_type text,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  tier text not null check (tier in ('basic', 'verified', 'pro', 'elite')),
  status text not null check (status in ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ───────────────────────────────────────────────

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-generate confirmation code for reservations
create or replace function generate_confirmation_code()
returns trigger as $$
begin
  new.confirmation_code := upper(substr(md5(random()::text || now()::text), 1, 8));
  return new;
end;
$$ language plpgsql;

create trigger set_confirmation_code
  before insert on reservations
  for each row execute procedure generate_confirmation_code();

-- Auto-recalculate restaurant average rating after review change
create or replace function update_restaurant_rating()
returns trigger as $$
begin
  update restaurants
  set
    average_rating = (
      select coalesce(avg(rating)::numeric(3,2), 0)
      from reviews
      where restaurant_id = coalesce(new.restaurant_id, old.restaurant_id)
    ),
    review_count = (
      select count(*)
      from reviews
      where restaurant_id = coalesce(new.restaurant_id, old.restaurant_id)
    )
  where id = coalesce(new.restaurant_id, old.restaurant_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger update_rating_on_review
  after insert or update or delete on reviews
  for each row execute procedure update_restaurant_rating();

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on profiles for each row execute procedure update_updated_at();
create trigger update_restaurants_updated_at
  before update on restaurants for each row execute procedure update_updated_at();
create trigger update_menu_items_updated_at
  before update on menu_items for each row execute procedure update_updated_at();
create trigger update_reservations_updated_at
  before update on reservations for each row execute procedure update_updated_at();
create trigger update_reviews_updated_at
  before update on reviews for each row execute procedure update_updated_at();
create trigger update_subscriptions_updated_at
  before update on subscriptions for each row execute procedure update_updated_at();

-- ───────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────

alter table profiles enable row level security;
alter table restaurants enable row level security;
alter table happy_hours enable row level security;
alter table menu_items enable row level security;
alter table reservations enable row level security;
alter table reviews enable row level security;
alter table review_photos enable row level security;
alter table checkins enable row level security;
alter table passport_stamps enable row level security;
alter table user_badges enable row level security;
alter table favorites enable row level security;
alter table notifications enable row level security;
alter table analytics_events enable row level security;
alter table special_deals enable row level security;
alter table subscriptions enable row level security;

-- Profiles
create policy "Anyone can view profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Restaurants
create policy "Anyone can view approved restaurants" on restaurants
  for select using (status = 'approved' or owner_id = auth.uid());
create policy "Owners can insert restaurants" on restaurants
  for insert with check (owner_id = auth.uid());
create policy "Owners can update own restaurants" on restaurants
  for update using (owner_id = auth.uid());

-- Happy hours
create policy "Anyone can view happy hours" on happy_hours for select using (true);
create policy "Owners can manage happy hours" on happy_hours for all using (
  exists (select 1 from restaurants where id = happy_hours.restaurant_id and owner_id = auth.uid())
);

-- Menu items
create policy "Anyone can view menu items" on menu_items for select using (true);
create policy "Owners can manage menu items" on menu_items for all using (
  exists (select 1 from restaurants where id = menu_items.restaurant_id and owner_id = auth.uid())
);

-- Reservations
create policy "Users can view own reservations" on reservations
  for select using (user_id = auth.uid());
create policy "Owners can view their reservations" on reservations
  for select using (
    exists (select 1 from restaurants where id = reservations.restaurant_id and owner_id = auth.uid())
  );
create policy "Users can create reservations" on reservations
  for insert with check (user_id = auth.uid());
create policy "Users can update own reservations" on reservations
  for update using (user_id = auth.uid());

-- Reviews
create policy "Anyone can view reviews" on reviews for select using (true);
create policy "Users can create reviews" on reviews for insert with check (user_id = auth.uid());
create policy "Users can update own reviews" on reviews for update using (user_id = auth.uid());
create policy "Users can delete own reviews" on reviews for delete using (user_id = auth.uid());

-- Favorites
create policy "Users can manage own favorites" on favorites for all using (user_id = auth.uid());

-- Notifications
create policy "Users can view own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications" on notifications for update using (user_id = auth.uid());

-- Checkins
create policy "Anyone can view checkins" on checkins for select using (true);
create policy "Users can create checkins" on checkins for insert with check (user_id = auth.uid());

-- Passport stamps
create policy "Anyone can view stamps" on passport_stamps for select using (true);
create policy "Users can manage own stamps" on passport_stamps for all using (user_id = auth.uid());

-- User badges
create policy "Anyone can view badges" on user_badges for select using (true);

-- Special deals
create policy "Anyone can view active deals" on special_deals for select using (is_active = true);
create policy "Owners can manage deals" on special_deals for all using (
  exists (select 1 from restaurants where id = special_deals.restaurant_id and owner_id = auth.uid())
);

-- Analytics events
create policy "Users can insert own events" on analytics_events
  for insert with check (user_id = auth.uid());

-- ───────────────────────────────────────────────
-- INDEXES
-- ───────────────────────────────────────────────

create index restaurants_neighborhood_idx on restaurants(neighborhood);
create index restaurants_status_idx on restaurants(status);
create index restaurants_tier_idx on restaurants(subscription_tier);
create index restaurants_location_idx on restaurants(latitude, longitude);
create index happy_hours_restaurant_idx on happy_hours(restaurant_id);
create index happy_hours_day_idx on happy_hours(day_of_week);
create index menu_items_restaurant_idx on menu_items(restaurant_id);
create index reservations_restaurant_idx on reservations(restaurant_id);
create index reservations_user_idx on reservations(user_id);
create index reservations_date_idx on reservations(reservation_date);
create index reviews_restaurant_idx on reviews(restaurant_id);
create index favorites_user_idx on favorites(user_id);
create index checkins_user_idx on checkins(user_id);
create index notifications_user_idx on notifications(user_id);
create index analytics_events_type_idx on analytics_events(event_type);
create index analytics_events_created_idx on analytics_events(created_at desc);
