# Follow other gamers

**Status:** READY FOR PR (signed-in flows not yet tested against the live project, see Verification)
**Issue:** #8
**Branch:** feature/follow-gamers

## Scope
Problem: Gamers can't follow each other. The profile page has a disabled "Follow (Coming soon)" button, no follower or following counts, and the home feed shows everyone's posts with no way to narrow it to people you follow.

Done when (the issue's acceptance criteria):
- A signed-in viewer sees a Follow / Unfollow button on another gamer's profile, and the button shows their current state.
- A profile shows its follower count and following count.
- The home feed has a way to show only posts from gamers the viewer follows.

Out of scope:
- Follower / following lists (who they are), "followed by you" badges elsewhere
- Follow notifications (`notifications.type = 'follow'` exists, but nothing creates it)
- Following communities (that is joining, issue #2)
- Suggested gamers, search (issues #9 and #18), sorting changes
- Removing the sample-profile fallback in `getProfileByUsername` (not this story, see Notes)

## What exists
- `follows` table (`follower_id`, `following_id`, `created_at`), primary key on the pair, `follows_no_self_follow` check. Already in `20261016183754_init_schema.sql` and `lib/database.types.ts`. **No migration needed.**
- Grants and RLS: `authenticated` can select, insert, delete. `anon` has no access. A user can only insert or delete rows where `follower_id` is themselves. Any signed-in user can read all follow rows.
- `app/profile/profile-content.tsx` renders `<ComingSoonAction label="Follow" />` for non-owners. Both `app/profile/page.tsx` (own profile) and `app/profile/[username]/page.tsx` render it.
- `app/communities/[id]/join-button.tsx` + `lib/communities/actions.ts` are the pattern for a toggle: client button with `useTransition`, Server Action returning `{ ok: true } | { ok: false; error }`, `getClaims()` auth check, unique-violation treated as success.
- `app/page.tsx` loads the public feed (20 newest, no NSFW/spoiler) and passes it to `app/home-content.tsx`, which does the search and sort in the browser.
- Missing: any follow query or Server Action, the button, counts, and a Following feed.

## Plan
1. `types/profile.ts`: add `FollowStats = { followers: number; following: number; isFollowing: boolean }`. Plain types only, so client code can import it.
2. `lib/follows/queries.ts` (`import 'server-only'`):
   - `getFollowStats(profileId, viewerId | null)` runs three queries in parallel: count of rows where `following_id = profileId`, count where `follower_id = profileId`, and (if signed in) whether the viewer's row exists. Uses `select('*', { count: 'exact', head: true })`.
   - `getFollowingIds(viewerId)` returns the `following_id` list.
3. `lib/follows/actions.ts` (`'use server'`): `followUser(targetId)` and `unfollowUser(targetId)`.
   - Reject a non-UUID id (reuse `isUuid` from `lib/communities/ids.ts`), a signed-out user ("Please log in to follow gamers"), and following yourself.
   - Follow inserts `{ follower_id: userId, following_id: targetId }`. Unique violation (`23505`) counts as success. A foreign-key failure (no such profile) returns "That gamer could not be found."
   - Unfollow deletes the viewer's own row. Deleting a row that isn't there is success.
   - Both call `revalidatePath` for `/profile/[username]` (page) and `/`.
4. `app/profile/follow-button.tsx` (client): modeled on `JoinButton`. Props `targetId`, `isFollowing`. Pending state ("Following…" / "Unfollowing…"), error text with `role="alert"`, refreshes through the Server Action's revalidate. Gold button to Follow, outlined button to Unfollow.
5. `app/profile/profile-content.tsx`: new optional prop `followStats?: FollowStats | null`.
   - Non-owner, signed in, real profile: render `<FollowButton>` in place of `ComingSoonAction`.
   - Non-owner, signed out: render a "Sign in to follow" link to `/login?next=/profile/<username>` (the `next` value is a site path).
   - Under the username, show "N followers · N following" when `followStats` is present.
6. `app/profile/[username]/page.tsx` and `app/profile/page.tsx`: call `getFollowStats` alongside the existing queries and pass it down. The own-profile page passes `isFollowing: false` and shows counts only.
7. `app/page.tsx` + `app/home-content.tsx`: read `?feed=following`. When the viewer is signed in, add an "Everyone | Following" switch above the feed (two links, current one highlighted). In Following mode the server fetches posts with `.in('author_id', followingIds)`, same columns, NSFW/spoiler filter and 20-post limit as today. Empty states: "You're not following anyone yet" / "No posts from people you follow yet". Signed-out visitors never see the switch, and `?feed=following` is ignored for them.
8. No migrations, no `lib/database.types.ts` changes, no new dependencies.

### Data shapes
```ts
type FollowStats = { followers: number; following: number; isFollowing: boolean }
type FollowResult = { ok: true } | { ok: false; error: string }
// Home feed: HomeContent gets one new prop
type HomeFeed = 'everyone' | 'following'
```

### Auth
- Profile pages and the home feed stay public. `getClaims()` only decides which control to show.
- `followUser` / `unfollowUser` each check `getClaims()` and return "Please log in" with no user. RLS is the real guard: a user can only add or remove their own row, and `anon` has no access to `follows`.
- The "Sign in to follow" link only ever points at a path on this site.

### Database changes
None.

## Decisions (defaults below unless you change them)
1. **Counts for signed-out visitors.** `follows` is readable by signed-in users only, so signed-out visitors can't count rows. Default: signed-out visitors see no counts and see "Sign in to follow". This is the same call made for member counts on communities. The alternative is a new migration with a counting function that signed-out users can call, which a teammate would have to review and run first.
2. **Home feed shape.** Default: keep "Everyone" as the feed and add a "Following" switch for signed-in users, so the public feed doesn't change. The alternative is to make Following the default for signed-in users.
3. **Large follow lists.** The Following feed passes the followed ids to one query, which is fine for a class project. A viewer following several hundred gamers could hit the request size limit. A database function fixes that, but it needs a migration, so it is parked.

## Verification
Checked in a sandbox with no access to Supabase or Google Fonts:
- `npm run lint`: passes.
- `npx tsc --noEmit`: passes after `npx next typegen`.
- `npm run build`: NOT checked here. It stops at downloading Geist from Google Fonts. Run it on a machine with internet.
- `npm run dev` with placeholder Supabase env vars, signed out: `/profile/<name>` shows "Sign in to follow" and no counts, `/?feed=following` shows the normal feed with no Everyone/Following switch, and no page crashes.

Still to check by a teammate against the live project (two test accounts, leave follows as you found them):
1. Signed in, other gamer's profile: Follow flips to Unfollow and their follower count goes up by one. Reloading keeps it. Unfollow reverses it.
2. Own profile: no Follow button, follower and following counts show.
3. `/?feed=following`: the Everyone / Following switch shows. Following lists only posts by followed gamers. With nobody followed, the "No posts from gamers you follow yet" message shows.
4. Failure paths: an expired session (sign out in another tab, then click Follow) shows the error text and doesn't crash.
5. Signed out: Follow isn't offered, and `/?feed=following` is the normal public feed.
6. Both the count queries and the Following feed query run against the real database (AGENTS.md asks for this with every new query).

## Notes
- `getProfileByUsername` returns a sample profile (with a placeholder id) when a username isn't found. The Follow button must not render for that sample profile, so the profile pages skip the follow controls and counts when `profile.id` is the fallback id. This needed `FALLBACK_PROFILE_ID` exported from `lib/profile/queries.ts`, a one-line change to a file the profile owner maintains. The sample fallback itself breaks the AGENTS.md rule about production sample data. It belongs to the profile owner, so it is not fixed here and should be raised with them.
