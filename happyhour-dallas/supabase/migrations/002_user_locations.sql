-- Real-time location sharing (opt-in only)
-- Run in Supabase Dashboard → SQL Editor → New Query

create table user_locations (
  user_id    uuid references profiles(id) on delete cascade primary key,
  latitude   numeric(10, 7) not null default 0,
  longitude  numeric(10, 7) not null default 0,
  accuracy   numeric(6, 2),
  is_sharing boolean default false,
  updated_at timestamptz default now()
);

alter table user_locations enable row level security;

-- Users can read and write only their own row
create policy "Users manage own location"
  on user_locations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Any authenticated user can read rows where sharing is on
-- (restaurant portal filters further by proximity client-side)
create policy "Read shared locations"
  on user_locations for select
  to authenticated
  using (is_sharing = true);

-- Efficient lookup of all currently-sharing users
create index user_locations_sharing_idx
  on user_locations(updated_at desc)
  where is_sharing = true;

-- Auto-update updated_at on upsert
create or replace function touch_user_location()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_locations_updated
  before insert or update on user_locations
  for each row execute procedure touch_user_location();
