-- Users can award badges to themselves (client-side badge logic)
create policy "Users can insert own badges" on user_badges
  for insert with check (user_id = auth.uid());

-- Unique constraint prevents double-awarding the same badge
alter table user_badges
  add constraint user_badges_user_badge_type_unique unique (user_id, badge_type);
