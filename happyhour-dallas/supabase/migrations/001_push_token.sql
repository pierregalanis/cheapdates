-- Add push_token column to profiles table
-- Run in Supabase Dashboard → SQL Editor → New Query

alter table profiles
  add column if not exists push_token text;

-- Index for targeted push sends (e.g. "all users near Uptown")
create index if not exists profiles_push_token_idx on profiles(push_token)
  where push_token is not null;
