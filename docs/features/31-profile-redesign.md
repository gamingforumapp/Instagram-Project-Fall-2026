# Profile redesign

**Status:** READY FOR PR (automated and signed-out checks done; saving with a real login still to be tested, see Verification)
**Issue:** #31 (related: #7)
**Branch:** feature/profile-redesign

## Scope
Problem: The profile page still uses the temporary design from PR #24, which no longer matches the dark-and-gold homepage from PR #30. It also shows placeholder content (fake posts, games, circles, friend counts, "Online", "Joined March 2026") as if it were real, and has a debug "Owner View" switch that lets a visitor overwrite their own profile with someone else's data.

Done when:
- `/profile` and `/profile/[username]` use the homepage design: crest header, dark bordered cards, gold accents, footer.
- Everything real keeps working: viewing your own or someone else's profile, editing display name, bio and gamer tags, copying gamer tags, sharing the profile link, and signing out.
- The posts section shows the person's real posts, newest first, in the same cards as the homepage feed: HTML shown as plain text, images from the `post-images` bucket, spoiler and NSFW posts left out, Like and Comment shown as "Coming soon". An empty state when there are none.
- Fake details become real or go away: the real join date; the communities they actually joined, instead of the fake circles; "Online", friend counts, the friend button and "Currently playing" removed, or shown as "Coming soon" where a feature is planned.
- The Owner View test switch is removed.

Out of scope:
- Comments on the profile. None exist yet, and the comments feature is in PR #28. Add them after it merges.
- Following and friends (#8), favorite games (part of #7, no way to add games yet), direct messages.
- The other PR #24 review fixes: the login open redirect, `.ilike` username matching, the fake profile for usernames that don't exist, the `?preview=` mode on `/profile`, fields that can't be cleared, and the gamer tag delete-then-insert. These need their own fix PR.
- A shared navigation bar for every page, which is a separate "connect the pages" story. The profile header will look like the homepage's but stays its own copy until then.
- Avatar upload and region editing.

## What exists
- `app/home-content.tsx` (PR #30): the design to match. `Crest`, `ComingSoonAction` and the post card markup live inside this file. Colors are written as hex values in class names (`#07090b` page, `#101319` cards, `#292d34` borders, `#e9b74e` gold, `#17140f` gold callout).
- `app/page.tsx`: the post query pattern to reuse, including `profiles!posts_author_id_fkey` (the short form fails on the live database) and `getPublicUrl` for `post-images`.
- `app/profile/profile-content.tsx` (about 1,100 lines, client component). Real parts to keep: `handleSaveProfile` (calls `updateProfile` and `saveGamerTags`), `handleSignOut`, `openEditModal`, `copyToClipboard`, Share Profile, the settings menu, and the edit modal fields. Everything else on the page is placeholder data or local-only state (`games`, `circles`, `likes`, `activeTab`, `friendStatus`, `inviteSent`, `selectedTag`, `perspective`).
- `app/profile/page.tsx` and `app/profile/[username]/page.tsx`: load the profile and render `ProfileContent`.
- `lib/profile/queries.ts`: `getProfileByUsername` and `getCurrentUserProfile` fill in fake fields (`status`, `friends_count`, `contributions_count`, `region: 'NA'` when empty, username `'gamer'` when empty).
- `types/profile.ts`: a hand-written `Profile` type, which `AGENTS.md` asks us to replace with generated helpers.
- `lib/profile/actions.ts`: unchanged by this story.
- Shared components already go in a top-level `components/` folder (PR #28 uses `components/auth/` and `components/comments/`).
- Live data (checked read only on 2026-11-04): 5 `[TEST]` posts, all by one account, in "Test Community"; 2 communities; 8 profiles, none with a username; no comments.

## Plan
1. `components/crest.tsx`: move `Crest` out of `app/home-content.tsx` unchanged and export it. `app/home-content.tsx` imports it.
2. `components/post-card.tsx`: move the post `<article>` markup and `ComingSoonAction` out of `app/home-content.tsx` into a `PostCard` component (props below), and export the `FeedPost` type. `app/home-content.tsx` renders `PostCard` and passes its "View profile" link or locked button as `action`, so the homepage looks and behaves exactly as before.
3. `types/profile.ts`: build `Profile` from `Tables<'profiles'>` (shape below). Remove the fake fields (`status`, `friends_count`, `friend_requests_count`, `contributions_count`).
4. `lib/profile/queries.ts`:
    - Both profile functions return the new shape: the real `bio`, `region` and `username` (NULL when not set, no more `'gamer'`), with gamer tags mapped by one shared helper instead of two copies.
    - `FALLBACK_PROFILE` stays (removing it is in the separate fix PR) but loses the fake fields.
    - New `getProfilePosts(profileId)`: the author's posts, newest first, limit 20, spoiler and NSFW left out, with the community name and the image's public URL.
    - New `getProfileCommunities(profileId)`: the communities they joined, with their role. Returns `[]` on any error, because signed-out visitors can't read memberships (RLS).
5. `app/profile/page.tsx` and `app/profile/[username]/page.tsx`: after loading the profile, load its posts and communities together (`Promise.all`) and pass them to `ProfileContent`. The login checks stay exactly as they are.
6. `app/profile/profile-content.tsx`: restyle in the homepage design, keeping the handlers listed above.
    - **Header:** crest + FACTION linking to `/`, Home, Communities (`/#communities`), then the viewer's profile link and Log out, or Sign in / Create account when signed out. No search box.
    - **Hero:** a dark banner with a gold accent, the avatar (`avatar_url` if set, otherwise initials), display name, `@username` or "No username yet", the join date from `created_at` (UTC, like the homepage), and a region badge only when `region` is set. Bio, or the existing empty-bio messages.
    - **Actions:** the owner keeps Edit profile, Share profile (only when a username exists, since the link needs one) and the settings menu with Sign out. Visitors see a disabled "Follow · Coming soon".
    - **Connect with me:** the gamer tags with Copy buttons, unchanged in behavior.
    - **Main column:** "Posts" with a `PostCard` for each post (meta line "in {community}" or "Profile post", plus the date). The empty state for the owner links to `/posts/new`.
    - **Sidebar:** "Communities", showing each name with an Owner or Moderator badge (empty state; signed-out note), and "Favorite games · Coming soon".
    - **Edit modal:** same fields, limits and messages, restyled.
    - **Footer:** the same as the homepage.
    - **Removed:** the Owner View switch (`perspective`), and the fake games, circles, posts, likes, tabs, status card, connection tags, and friend, message and invite buttons. `isOwner` comes only from `isOwnProfile`.
7. Run the checks under Verification, then update this doc.

### Data shapes
```ts
// components/post-card.tsx
export type FeedPost = Pick<Tables<'posts'>, 'id' | 'title' | 'content' | 'created_at' | 'upvote_count'> & {
  imageUrl: string | null
}
type PostCardProps = { post: FeedPost; meta?: string; action?: ReactNode }
// app/home-content.tsx keeps: type HomePost = FeedPost & { authorUsername: string | null }

// types/profile.ts
export type GamerTags = Partial<Record<'psn' | 'xbox' | 'steam' | 'discord', string>>
export type Profile = Pick<Tables<'profiles'>, 'id' | 'username' | 'display_name' | 'bio' | 'avatar_url' | 'region' | 'created_at'> & {
  gamer_tags: GamerTags
  is_own_profile: boolean
}

// lib/profile/queries.ts
export type ProfilePost = FeedPost & { communityName: string | null }
export type ProfileCommunity = Pick<Tables<'communities'>, 'id' | 'name'> & { role: Tables<'community_members'>['role'] }
getProfilePosts(profileId: string): Promise<{ posts: ProfilePost[]; error: boolean }>
getProfileCommunities(profileId: string): Promise<ProfileCommunity[]>

// app/profile/profile-content.tsx
type ProfileContentProps = {
  profile?: Profile
  initialUsername?: string
  isOwnProfile?: boolean
  posts: ProfilePost[]
  postsError: boolean
  communities: ProfileCommunity[]
  isSignedIn: boolean
}
```

Queries (all through the Data API with the user's session):
- Posts: `posts.select('id, title, content, created_at, upvote_count, image_path, communities(name)').eq('author_id', id).eq('is_nsfw', false).eq('is_spoiler', false).order('created_at', { ascending: false }).limit(20)`
- Communities: `community_members.select('role, communities(id, name)').eq('user_id', id)`

### Auth
- `/profile`: unchanged. A signed-out visitor is redirected to `/login?next=/profile` (the existing `?preview=` bypass is left for the separate fix PR).
- `/profile/[username]`: unchanged, public. `isSignedIn` comes from the existing `getClaims()` call and picks the header buttons.
- Posts: RLS lets anyone read posts, so visitors and signed-out users see the same list.
- Communities: RLS only lets signed-in users read memberships. Signed out, the query fails, the list is empty, and the sidebar says "Sign in to see communities".
- Editing: unchanged. `updateProfile` and `saveGamerTags` check the user with `getUser()` and only ever write the signed-in user's own rows, and RLS enforces the same.

### Database changes
None.

### New dependencies
None.

## Verification
`npm run lint`, `npx tsc --noEmit` and `npm run build` all pass on Node 24.22.2.

Checked in headless Chromium against the live Supabase project (read only, 39 checks, no console errors or hydration warnings):
- Real posts: 5 posts from the live project, newest first, with "in Test Community", the date, an image loaded from `post-images`, and Like and Comment "Coming soon". The HTML body shows as plain text and no script runs.
- Owner layout: no Owner View switch and no fake content. Copy puts the gamer tag on the clipboard, Share puts `/profile/{username}` on it, and the settings menu opens without being clipped.
- Edit modal: all fields are prefilled, the bio counter updates, the 300-character limit is set, Cancel closes it, and saving while signed out shows "You must be logged in to update your profile."
- Visitor layout: no edit, share or settings controls, Follow is disabled, and signed out shows the communities note and Sign in / Create account.
- Signed out: `/profile` redirects to `/login?next=/profile`.
- Homepage after the shared component move: the feed, images, "Public post" line, Like and Comment "Coming soon", and the guest popup all still work.
- At 390px and 320px wide there's no sideways scrolling on `/profile`, `/profile/{username}` or `/`, and the edit modal fits a phone.

How the real posts were checked: `FALLBACK_PROFILE.id` was temporarily pointed at the account that owns the test posts, because no profile has a username yet, then restored (the file was byte-identical afterwards). The owner and visitor layouts were reached with the fallback profile and `?preview=true`.

Both new queries also ran directly against the live database. The posts query returned all 5 posts with the community name. The communities query returns "permission denied" signed out, which `getProfileCommunities` turns into an empty list.

Looked over by hand while signed in on localhost (2026-11-08, by Dominic): the page and design look right.

Not checked yet (these need a real signed-in account, to do by hand):
- Saving: change the display name, bio and all four gamer tags, save, and confirm they show after a reload. Also saving with an empty display name and bio (an empty update returned 204 from the live API, so it should succeed).
- "No username yet" and the hidden Share button on a real account.
- The real join date and the region badge.
- The communities list with its Owner or Moderator badge.
- Your own posts and the real "You haven't posted yet" empty state.
- Sign out from the header and from the settings menu.
- A real `avatar_url` picture (a Discord or Google account).
- Visitor view of a real profile while signed in (needs a username set on a test account in the Supabase Table Editor).

Not checkable through the site:
- Leaving out spoiler and NSFW posts. The create-post form has no such option, so this is only confirmed by reading the query, unless a test row is added.

## Notes
- Shared components: the plan moves `Crest` and the post card into `components/` so both pages share one copy, at the cost of editing `app/home-content.tsx`. The alternative is copying them into the profile, which risks the two pages drifting apart.
- Usernames: "No username yet" replaces the fake `@gamer`, and Share is hidden until a username exists, because a shared `/profile/gamer` link would open someone else's page or the fake profile.
- Avatar: `avatar_url` is real data (the sign-up trigger copies the Discord or Google picture), so it shows when set. It uses a plain `<img>`, like post images on the homepage, because `next/image` would need the hosts added to `next.config.ts`.
- Display name: the queries now return the real value (NULL when not set), and the edit modal prefills from that. Before, opening the modal and saving wrote the fallback ("Gamer" or the username) into `display_name`.
- Added beyond the plan: `router.refresh()` after a successful save, so edits also show on the `/profile/{username}` version of your own page, which `revalidatePath('/profile')` doesn't cover. And "Sign in to see gamer tags." for signed-out visitors, since RLS hides tags from them and "No gamer tags linked yet" would be untrue.
- Inherited from the homepage, left as is to match: the footer text isn't aligned with the page content on desktop, and it wraps on phones.
- This Claude Code session's shell has a system Node 26 ahead of mise on its `PATH`, so the dev server was started with Node 24 explicitly to match Vercel.
