-- RPC: increment_user_points
-- Called by lib/checkin.ts after a successful check-in
-- The function bypasses RLS so points can be incremented without exposing the update policy

create or replace function increment_user_points(p_user_id uuid, p_points integer)
returns void
language sql
security definer
as $$
  update profiles
  set points = points + p_points,
      updated_at = now()
  where id = p_user_id;
$$;
