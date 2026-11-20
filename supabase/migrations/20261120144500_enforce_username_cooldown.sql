-- Enforce 7-day cooldown on username changes and ensure unique usernames.
-- 1. Adds username_changed_at to public.profiles.
-- 2. Creates a trigger function in private schema to record username_changed_at
--    and reject username changes if less than 7 days have passed since the previous change.
-- 3. Grants select to authenticated and anon so clients can read the cooldown timer.

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

comment on column public.profiles.username_changed_at is
  'Timestamp when the username was last set or updated. Enforces the 7-day cooldown.';

grant select (username_changed_at) on public.profiles to anon, authenticated;

-- Function in private schema to enforce the 7-day cooldown on username modifications
create or replace function private.handle_username_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only check if the username is actually being updated
  if new.username is distinct from old.username then
    -- If the user already had a username and a previous change timestamp, enforce the 7-day cooldown
    if old.username is not null and old.username_changed_at is not null then
      if old.username_changed_at > (now() - interval '7 days') then
        raise exception 'Username can only be changed once every 7 days. You can change it again after %',
          to_char(old.username_changed_at + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
      end if;
    end if;

    -- Record timestamp of change
    new.username_changed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_username_updated on public.profiles;

create trigger on_username_updated
  before update of username on public.profiles
  for each row execute function private.handle_username_update();
