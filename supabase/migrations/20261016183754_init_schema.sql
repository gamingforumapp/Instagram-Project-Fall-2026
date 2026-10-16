-- =============================================================================
-- Initial schema for Faction (matches docs/database/schema.dbml)
--
-- What this file does, in order:
--   1. Drops the 5 tables from the first draft (they were empty).
--   2. Creates every Sprint 1 table with its RLS, grants and policies right
--      after it, so no table ever exists without its security rules.
--   3. Adds triggers that do privileged work: creating profiles at sign-up,
--      making a community's creator its owner, keeping vote counts in sync,
--      creating @mention notifications, and setting updated_at.
--   4. Creates the Storage buckets for avatars and post images, with upload rules.
--
-- Not in this file (later migrations): clips, game_reviews, the clips bucket.
--
-- How the security works (see AGENTS.md):
--   - GRANT decides which kinds of action a role may take at all
--     (anon = signed-out visitor, authenticated = signed-in user,
--      service_role = our server code using the secret key).
--   - RLS policies decide which ROWS those actions apply to.
--   - Every table starts with `revoke all`, so nothing is allowed unless granted.
--   - (select auth.uid()) is the id of the signed-in user making the request.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Safety check: never run this file twice.
--    Step 1 drops tables, so running it again on a live database would delete data.
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.post_votes') is not null then
    raise exception 'This migration has already been applied. Do not run it again: it would drop tables and delete data.';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- 1. Remove the first-draft tables (empty) and any old sign-up trigger
-- -----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.posts cascade;
drop table if exists public.community_members cascade;
drop table if exists public.communities cascade;
drop table if exists public.profiles cascade;


-- -----------------------------------------------------------------------------
-- 2. A private schema for trigger functions
--    It is not exposed through the Data API, so nobody can call these directly.
-- -----------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Shared trigger: set updated_at whenever a row is edited
-- -----------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- =============================================================================
-- PROFILES
-- =============================================================================

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     varchar(30) unique,
  display_name varchar(100),
  bio          varchar(300),
  avatar_url   text,
  region       text,
  created_at   timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_region_values check (region in ('na', 'latam', 'eu', 'mea', 'asia', 'oce'))
);

comment on column public.profiles.username is
  'Lowercase only. NULL until the user picks one (OAuth sign-ups, or the name was taken at sign-up).';

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, display_name, bio, avatar_url, region) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create policy "Anyone can view profiles"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert policy: profiles are created only by the sign-up trigger below.
-- No delete policy: a profile is deleted when its auth user is deleted (cascade).


-- Sign-up trigger: create a profile for every new auth user.
-- It must NEVER raise an error, because that would block sign-up.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted_username text := lower(new.raw_user_meta_data ->> 'username');
  name_from_oauth text := left(coalesce(new.raw_user_meta_data ->> 'full_name',
                                        new.raw_user_meta_data ->> 'name'), 100);
  picture_from_oauth text := new.raw_user_meta_data ->> 'avatar_url';
begin
  begin
    insert into public.profiles (id, username, display_name, avatar_url)
    values (new.id, wanted_username, name_from_oauth, picture_from_oauth);
  exception when unique_violation or check_violation or string_data_right_truncation then
    -- Username taken or invalid: create the profile without one.
    -- The app sends users with no username to an onboarding page.
    insert into public.profiles (id, display_name, avatar_url)
    values (new.id, name_from_oauth, picture_from_oauth);
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Give a profile to any test users who signed up before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;


-- =============================================================================
-- GAMER TAGS (Steam, PSN, Xbox, Discord handles)
-- =============================================================================

create table public.gamer_tags (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  platform   text not null,
  handle     varchar(100) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, platform),
  constraint gamer_tags_platform_values check (platform in ('steam', 'psn', 'xbox', 'discord')),
  constraint gamer_tags_handle_not_blank check (char_length(trim(handle)) > 0)
);

alter table public.gamer_tags enable row level security;
revoke all on public.gamer_tags from anon, authenticated;
grant select, insert, delete on public.gamer_tags to authenticated;
grant update (handle) on public.gamer_tags to authenticated;
grant select, insert, update, delete on public.gamer_tags to service_role;

create policy "Signed-in users can view gamer tags"
  on public.gamer_tags for select
  to authenticated
  using (true);

create policy "Users can add their own gamer tags"
  on public.gamer_tags for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can edit their own gamer tags"
  on public.gamer_tags for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can remove their own gamer tags"
  on public.gamer_tags for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- =============================================================================
-- FOLLOWS
-- =============================================================================

create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update, delete on public.follows to service_role;

create policy "Signed-in users can view follows"
  on public.follows for select
  to authenticated
  using (true);

create policy "Users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

create policy "Users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using (follower_id = (select auth.uid()));


-- =============================================================================
-- GAMES (local cache of IGDB or RAWG data; only server code writes)
-- =============================================================================

create table public.games (
  id          uuid primary key default gen_random_uuid(),
  external_id integer not null unique,
  name        text not null,
  cover_url   text,
  released_on date,
  summary     text,
  genres      text[],
  platforms   text[],
  synced_at   timestamptz not null default now()
);

alter table public.games enable row level security;
revoke all on public.games from anon, authenticated;
grant select on public.games to anon, authenticated;
grant select, insert, update, delete on public.games to service_role;

create policy "Anyone can view games"
  on public.games for select
  to anon, authenticated
  using (true);

-- No write policies: only service_role (which bypasses RLS) writes games.


-- =============================================================================
-- USER GAMES (favorite games now, find-players fields later)
-- =============================================================================

create table public.user_games (
  user_id           uuid not null references public.profiles (id) on delete cascade,
  game_id           uuid not null references public.games (id) on delete cascade,
  is_favorite       boolean not null default true,
  platform          text,
  rank_tier         text,
  rank_details      jsonb,
  looking_for_group boolean not null default false,
  added_at          timestamptz not null default now(),
  primary key (user_id, game_id),
  constraint user_games_platform_values check (platform in ('pc', 'playstation', 'xbox', 'switch', 'mobile'))
);

create index user_games_game_id_idx on public.user_games (game_id);

alter table public.user_games enable row level security;
revoke all on public.user_games from anon, authenticated;
grant select, insert, delete on public.user_games to authenticated;
grant update (is_favorite, platform, rank_tier, rank_details, looking_for_group)
  on public.user_games to authenticated;
grant select, insert, update, delete on public.user_games to service_role;

create policy "Signed-in users can view user games"
  on public.user_games for select
  to authenticated
  using (true);

create policy "Users can add their own games"
  on public.user_games for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can edit their own games"
  on public.user_games for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can remove their own games"
  on public.user_games for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- =============================================================================
-- COMMUNITIES ("forums" in #5 are communities)
-- =============================================================================

create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(100) not null,
  description varchar(1000),
  game_id     uuid references public.games (id) on delete set null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint communities_name_not_blank check (char_length(trim(name)) >= 3)
);

create unique index communities_name_lower_key on public.communities (lower(name));
create index communities_game_id_idx on public.communities (game_id);
create index communities_created_by_idx on public.communities (created_by);


-- =============================================================================
-- COMMUNITY MEMBERS (membership + roles: member, moderator, owner)
-- Created before the communities policies because they check it.
-- =============================================================================

create table public.community_members (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (user_id, community_id),
  constraint community_members_role_values check (role in ('member', 'moderator', 'owner'))
);

create index community_members_community_id_idx on public.community_members (community_id);
create index community_members_role_idx on public.community_members (community_id, role);

alter table public.community_members enable row level security;
revoke all on public.community_members from anon, authenticated;
grant select, delete on public.community_members to authenticated;
-- Users can only insert user_id and community_id, so role always starts as 'member'.
grant insert (user_id, community_id) on public.community_members to authenticated;
-- Only role can ever be updated (the policy below limits who can do it).
grant update (role) on public.community_members to authenticated;
grant select, insert, update, delete on public.community_members to service_role;

create policy "Signed-in users can view memberships"
  on public.community_members for select
  to authenticated
  using (true);

create policy "Users can join communities as themselves"
  on public.community_members for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Owners can make members moderators or turn moderators back into members.
-- They cannot change an owner's row or make anyone an owner.
create policy "Owners can change member roles"
  on public.community_members for update
  to authenticated
  using (
    role <> 'owner'
    and exists (
      select 1 from public.community_members as me
      where me.community_id = community_members.community_id
        and me.user_id = (select auth.uid())
        and me.role = 'owner'
    )
  )
  with check (role in ('member', 'moderator'));

-- Members and moderators can leave. Owners cannot leave their own community.
create policy "Users can leave communities"
  on public.community_members for delete
  to authenticated
  using (user_id = (select auth.uid()) and role <> 'owner');


-- Communities: security rules (now that community_members exists)
alter table public.communities enable row level security;
revoke all on public.communities from anon, authenticated;
grant select on public.communities to anon, authenticated;
grant insert (name, description, game_id, created_by) on public.communities to authenticated;
grant update (description, game_id) on public.communities to authenticated;
grant delete on public.communities to authenticated;
grant select, insert, update, delete on public.communities to service_role;

create policy "Anyone can view communities"
  on public.communities for select
  to anon, authenticated
  using (true);

create policy "Users can create communities as themselves"
  on public.communities for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Owners and moderators can edit their community"
  on public.communities for update
  to authenticated
  using (
    exists (
      select 1 from public.community_members as m
      where m.community_id = communities.id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'moderator')
    )
  );

create policy "Owners can delete their community"
  on public.communities for delete
  to authenticated
  using (
    exists (
      select 1 from public.community_members as m
      where m.community_id = communities.id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
  );


-- When a community is created, its creator automatically becomes its owner.
create function private.add_community_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.community_members (user_id, community_id, role)
    values (new.created_by, new.id, 'owner');
  end if;
  return new;
end;
$$;

create trigger on_community_created
  after insert on public.communities
  for each row execute function private.add_community_owner();


-- =============================================================================
-- COMMUNITY FLAIRS (Tutorial, LFG, Clip, Patch Notes...)
-- =============================================================================

create table public.community_flairs (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  name         varchar(30) not null,
  color        varchar(7),
  created_at   timestamptz not null default now(),
  unique (community_id, name),
  constraint community_flairs_name_not_blank check (char_length(trim(name)) > 0),
  constraint community_flairs_color_hex check (color ~ '^#[0-9a-fA-F]{6}$')
);

alter table public.community_flairs enable row level security;
revoke all on public.community_flairs from anon, authenticated;
grant select on public.community_flairs to anon, authenticated;
grant insert (community_id, name, color) on public.community_flairs to authenticated;
grant update (name, color) on public.community_flairs to authenticated;
grant delete on public.community_flairs to authenticated;
grant select, insert, update, delete on public.community_flairs to service_role;

create policy "Anyone can view flairs"
  on public.community_flairs for select
  to anon, authenticated
  using (true);

create policy "Owners and moderators can add flairs"
  on public.community_flairs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.community_members as m
      where m.community_id = community_flairs.community_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'moderator')
    )
  );

create policy "Owners and moderators can edit flairs"
  on public.community_flairs for update
  to authenticated
  using (
    exists (
      select 1 from public.community_members as m
      where m.community_id = community_flairs.community_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'moderator')
    )
  );

create policy "Owners and moderators can delete flairs"
  on public.community_flairs for delete
  to authenticated
  using (
    exists (
      select 1 from public.community_members as m
      where m.community_id = community_flairs.community_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'moderator')
    )
  );


-- =============================================================================
-- POSTS (community posts, or profile posts when community_id is NULL)
-- =============================================================================

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid references public.profiles (id) on delete set null,
  community_id   uuid references public.communities (id) on delete cascade,
  flair_id       uuid references public.community_flairs (id) on delete set null,
  title          varchar(200) not null,
  content        text not null default '',
  image_path     text,
  is_spoiler     boolean not null default false,
  is_nsfw        boolean not null default false,
  upvote_count   integer not null default 0,
  downvote_count integer not null default 0,
  score          integer generated always as (upvote_count - downvote_count) stored,
  search_vector  tsvector generated always as (
                   to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
                 ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz,
  constraint posts_title_not_blank check (char_length(trim(title)) > 0),
  constraint posts_content_length check (char_length(content) <= 40000),
  constraint posts_counts_not_negative check (upvote_count >= 0 and downvote_count >= 0),
  constraint posts_profile_posts_have_no_flair check (community_id is not null or flair_id is null)
);

comment on column public.posts.community_id is 'NULL = profile post';
comment on column public.posts.author_id is
  'NULL after the author deletes their account and chooses to keep their posts';

create index posts_community_feed_idx on public.posts (community_id, created_at);
create index posts_author_idx on public.posts (author_id, created_at);
create index posts_flair_id_idx on public.posts (flair_id);
create index posts_search_idx on public.posts using gin (search_vector);

-- Only author edits count as "edited". Vote count changes do not touch updated_at.
create trigger posts_set_updated_at
  before update of flair_id, title, content, image_path, is_spoiler, is_nsfw on public.posts
  for each row execute function private.set_updated_at();

alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
-- Users choose these columns. Vote counts, score, search_vector, created_at and
-- updated_at are set by the database, never by the browser.
grant insert (author_id, community_id, flair_id, title, content, image_path, is_spoiler, is_nsfw)
  on public.posts to authenticated;
grant update (flair_id, title, content, image_path, is_spoiler, is_nsfw)
  on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant select, insert, update, delete on public.posts to service_role;

create policy "Anyone can view posts"
  on public.posts for select
  to anon, authenticated
  using (true);

-- Post as yourself. If a flair is picked, it must belong to this post's community.
create policy "Users can create posts as themselves"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      flair_id is null
      or exists (
        select 1 from public.community_flairs as f
        where f.id = posts.flair_id
          and f.community_id = posts.community_id
      )
    )
  );

create policy "Authors can edit their posts"
  on public.posts for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and (
      flair_id is null
      or exists (
        select 1 from public.community_flairs as f
        where f.id = posts.flair_id
          and f.community_id = posts.community_id
      )
    )
  );

create policy "Authors can delete their posts"
  on public.posts for delete
  to authenticated
  using (author_id = (select auth.uid()));


-- =============================================================================
-- COMMENTS (Reddit-style threads via parent_comment_id; soft delete only)
-- =============================================================================

create table public.comments (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.posts (id) on delete cascade,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  author_id         uuid references public.profiles (id) on delete set null,
  content           text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  deleted_at        timestamptz,
  constraint comments_deleted_have_no_text check (deleted_at is null or content = ''),
  constraint comments_not_blank check (deleted_at is not null or char_length(trim(content)) > 0),
  constraint comments_content_length check (char_length(content) <= 10000)
);

create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id, created_at);
create index comments_parent_idx on public.comments (parent_comment_id);

create trigger comments_set_updated_at
  before update of content on public.comments
  for each row execute function private.set_updated_at();

alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, parent_comment_id, author_id, content) on public.comments to authenticated;
-- "Deleting" a comment = update deleted_at = now() and content = ''.
-- There is no delete grant, so replies under a deleted comment are never lost.
grant update (content, deleted_at) on public.comments to authenticated;
grant select, insert, update, delete on public.comments to service_role;

create policy "Anyone can view comments"
  on public.comments for select
  to anon, authenticated
  using (true);

-- Comment as yourself. A reply must be on the same post as the comment it replies to.
-- Note: inside the subquery, "comments." means the NEW comment being inserted and
-- "parent." means the comment being replied to. Both tables have a parent_comment_id
-- column, so every column here is written with its table name to avoid mixing them up.
create policy "Users can comment as themselves"
  on public.comments for insert
  to authenticated
  with check (
    comments.author_id = (select auth.uid())
    and (
      comments.parent_comment_id is null
      or exists (
        select 1 from public.comments as parent
        where parent.id = comments.parent_comment_id
          and parent.post_id = comments.post_id
      )
    )
  );

create policy "Authors can edit or soft-delete their comments"
  on public.comments for update
  to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));


-- =============================================================================
-- POST VOTES (one up or down vote per user per post)
-- =============================================================================

create table public.post_votes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  value      smallint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id),
  constraint post_votes_value_values check (value in (-1, 1))
);

create index post_votes_post_id_idx on public.post_votes (post_id);

alter table public.post_votes enable row level security;
revoke all on public.post_votes from anon, authenticated;
grant select, insert, delete on public.post_votes to authenticated;
grant update (value) on public.post_votes to authenticated;
grant select, insert, update, delete on public.post_votes to service_role;

-- Users only see their own votes (to highlight the arrow they clicked).
-- Everyone sees the totals through posts.upvote_count / downvote_count / score.
create policy "Users can view their own votes"
  on public.post_votes for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can vote as themselves"
  on public.post_votes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can change their own vote"
  on public.post_votes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can remove their own vote"
  on public.post_votes for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- Keep posts.upvote_count and downvote_count in sync with post_votes.
-- Subtract the old vote (update/delete), then add the new one (insert/update).
create function private.update_post_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.posts
    set upvote_count   = upvote_count   - (old.value = 1)::int,
        downvote_count = downvote_count - (old.value = -1)::int
    where id = old.post_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update public.posts
    set upvote_count   = upvote_count   + (new.value = 1)::int,
        downvote_count = downvote_count + (new.value = -1)::int
    where id = new.post_id;
  end if;

  return null;
end;
$$;

create trigger post_votes_update_counts
  after insert or update or delete on public.post_votes
  for each row execute function private.update_post_vote_counts();


-- =============================================================================
-- NOTIFICATIONS (created only by the database when someone is @mentioned)
-- =============================================================================

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id     uuid not null references public.profiles (id) on delete cascade,
  type         text not null,
  post_id      uuid references public.posts (id) on delete cascade,
  comment_id   uuid references public.comments (id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint notifications_type_values check (type in ('mention', 'reply', 'follow')),
  constraint notifications_need_post check (type = 'follow' or post_id is not null)
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at);
create index notifications_actor_id_idx on public.notifications (actor_id);
create index notifications_post_id_idx on public.notifications (post_id);
create index notifications_comment_id_idx on public.notifications (comment_id);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = (select auth.uid()));

create policy "Users can mark their own notifications as read"
  on public.notifications for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy "Users can clear their own notifications"
  on public.notifications for delete
  to authenticated
  using (recipient_id = (select auth.uid()));

-- No insert policy: users can never create notifications themselves.


-- Find @username mentions and notify each mentioned user once.
-- The pattern ignores emails like name@example.com (the @ must not follow a letter/digit).
create function private.notify_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_id is null then
    return null;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id)
  select p.id, new.author_id, 'mention', new.id
  from public.profiles as p
  where p.id <> new.author_id
    and p.username in (
      select distinct m[1]
      from regexp_matches(
        lower(coalesce(new.title, '') || ' ' || coalesce(new.content, '')),
        '(?:^|[^a-z0-9_])@([a-z0-9_]{3,30})', 'g'
      ) as m
    );

  return null;
end;
$$;

create function private.notify_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_id is null then
    return null;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  select p.id, new.author_id, 'mention', new.post_id, new.id
  from public.profiles as p
  where p.id <> new.author_id
    and p.username in (
      select distinct m[1]
      from regexp_matches(
        lower(coalesce(new.content, '')),
        '(?:^|[^a-z0-9_])@([a-z0-9_]{3,30})', 'g'
      ) as m
    );

  return null;
end;
$$;

create trigger posts_notify_mentions
  after insert on public.posts
  for each row execute function private.notify_post_mentions();

create trigger comments_notify_mentions
  after insert on public.comments
  for each row execute function private.notify_comment_mentions();


-- -----------------------------------------------------------------------------
-- Trigger functions are only run by triggers, never called by users.
-- -----------------------------------------------------------------------------

revoke all on all functions in schema private from public, anon, authenticated;


-- =============================================================================
-- STORAGE: avatars and post images
-- Files go in a folder named after the uploader's user id: {user_id}/{random}.webp
-- Both buckets are public (anyone can view the files by URL), but only the
-- owner of a folder can upload to it or delete from it.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('post-images', 'post-images', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Users can upload avatars to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can see their own avatar files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete their own avatar files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can upload post images to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can see their own post image files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete their own post image files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
