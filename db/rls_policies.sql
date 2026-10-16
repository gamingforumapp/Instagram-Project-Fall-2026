
-- Faction: Row Level Security (RLS)
-- Table 1: profiles
-- Draft for team review. Do not execute in production yet.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view public gamer profiles.
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Users can create only their own profile.
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

-- Users can update only their own profile.
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);


-- ============================================
-- Table 2: Communities
-- Draft for team review. Do not execute yet.
-- ============================================

ALTER TABLE public.communities
ENABLE ROW LEVEL SECURITY;

-- Anyone can view gaming communities.
CREATE POLICY "Communities are viewable by everyone"
ON public.communities
FOR SELECT
TO anon, authenticated
USING (true);

-- Logged-in users can create communities
-- only under their own user ID.
CREATE POLICY "Authenticated users can create communities"
ON public.communities
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = created_by);

-- Only the creator can update their community.
CREATE POLICY "Creators can update their communities"
ON public.communities
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = created_by)
WITH CHECK ((SELECT auth.uid()) = created_by);

-- Only the creator can delete their community.
CREATE POLICY "Creators can delete their communities"
ON public.communities
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = created_by);

-- ============================================
-- Table 3: Community Memberships
-- Draft for team review. Do not execute yet.
-- ============================================

ALTER TABLE public.community_members
ENABLE ROW LEVEL SECURITY;

-- Anyone can view community memberships.
CREATE POLICY "Community memberships are viewable by everyone"
ON public.community_members
FOR SELECT
TO anon, authenticated
USING (true);

-- Logged-in users can join communities themselves.
CREATE POLICY "Users can join communities"
ON public.community_members
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can leave communities by removing
-- their own membership.
CREATE POLICY "Users can leave communities"
ON public.community_members
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- ==================================================
-- Table 4: Posts
-- Existing policies in Supabase (documentation only).
-- Do not execute this section in production.
-- ==================================================

-- SELECT: Everyone can view posts.
-- Existing policy: "Posts are viewable by everyone"
-- TO public
-- USING (true)

-- INSERT: Authenticated community members can create
-- posts only under their own author_id.
-- Existing policy: "Members can create posts"
-- WITH CHECK:
--   auth.uid() = author_id
--   AND user belongs to the post's community.

-- UPDATE: Only the post author can update a post.
-- Existing policy: "Authors can update their own posts"
-- USING (auth.uid() = author_id)
-- WITH CHECK (auth.uid() = author_id)

-- DELETE: Post authors and community creators
-- can delete posts in their communities.
-- Existing policy:
-- "Authors and community creators can delete posts"
-- USING:
--   auth.uid() = author_id
--   OR auth.uid() = the community's created_by.

