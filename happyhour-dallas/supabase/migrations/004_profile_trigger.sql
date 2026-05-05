-- Auto-create profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, points, level, created_at, updated_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    0,
    'Newcomer',
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update level when points change
create or replace function public.sync_user_level()
returns trigger
language plpgsql
as $$
begin
  new.level := case
    when new.points >= 2500 then 'Dallas Icon'
    when new.points >= 1000 then 'Happy Hour Pro'
    when new.points >= 500  then 'Local Legend'
    when new.points >= 100  then 'Regular'
    else 'Newcomer'
  end;
  return new;
end;
$$;

drop trigger if exists on_points_updated on public.profiles;
create trigger on_points_updated
  before update on public.profiles
  for each row
  when (old.points is distinct from new.points)
  execute function public.sync_user_level();
