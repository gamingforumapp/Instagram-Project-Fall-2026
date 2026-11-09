# Communities: browse, community page, join and leave

**Status:** READY FOR PR (Join/Leave and real data not yet tested against the live project, see Verification)
**Issue:** none linked yet. Overlaps #2 (join), #15 and #16 (community feed). Confirm who owns these before building.
**Branch:** feature/communities

## Scope
Problem: Communities exist in the database and on the homepage, but you can't open one, see its posts, or join it. Joining is also what unlocks posting, because `/posts/new` only offers communities you belong to.

Done when:
- `/communities` lists every community.
- `/communities/[id]` shows one community (name, linked game, description) and its posts, newest first.
- A signed-in user can Join and Leave from that page, and the page shows their current state.
- A signed-out visitor sees "Sign in to join" instead of the button.
- An unknown or malformed id shows a 404.

Out of scope:
- Creating, editing or deleting a community
- Member counts (members are only readable by signed-in users)
- Flairs, moderators and roles UI, search, sorting, spoiler/NSFW blur (issue #10)
- Preselecting the community in `/posts/new`
- Comments and voting on the page (PR #28 and later work)

## What exists
- `communities`: readable by everyone (`Anyone can view communities`).
- `posts`: readable by everyone. `community_id` links a post to a community.
- `community_members`: readable by signed-in users only. A user can insert their own row (only `user_id` and `community_id`, so the role is always `member`) and delete their own row unless the role is `owner`.
- `/posts/new` already requires a membership and shows "Join a community first" when there is none.
- `lib/posts/actions.ts` is the Server Action pattern to copy (`getClaims()`, typed result `{ ok: true } | { ok: false; error }`).
- The merged homepage (`app/home-content.tsx`) loads communities and posts, hides spoiler and NSFW posts, and uses the `profiles!posts_author_id_fkey` author lookup. Its community cards and "Communities" nav link don't go anywhere yet.
- Missing: any `/communities` route, a shared header, and any join/leave code.

## Plan
1. `lib/communities/queries.ts` (`import 'server-only'`): `getCommunities()`, `getCommunity(id)`, `getCommunityPosts(id)`, `getMembershipRole(communityId, userId)`. Types come from `Tables<'communities'>` and `Tables<'posts'>`. Posts use `profiles!posts_author_id_fkey(username)` and skip spoiler and NSFW posts, matching the homepage.
2. `lib/communities/actions.ts` (`'use server'`): `joinCommunity(communityId)` and `leaveCommunity(communityId)`. Each checks `getClaims()`, inserts or deletes the user's own `community_members` row, then calls `revalidatePath` for the community page and `/communities`. Typed results with plain error messages. Leaving as an owner returns an error (RLS also blocks it).
3. `components/site-header.tsx` and a small `components/community-card.tsx`: header with Home / Communities and sign-in state, matching the homepage's dark and gold styling (same colors as `home-content.tsx`).
4. `app/communities/page.tsx`: list page.
5. `app/communities/[id]/page.tsx`: community page. `params` is awaited. A non-UUID id or a missing row calls `notFound()`.
6. `app/communities/[id]/join-button.tsx` (client component): calls the Server Actions inside `useTransition`, shows the pending state and any error, and refreshes the route.
7. `app/home-content.tsx` is NOT touched (decision below). Homepage cards and its "Communities" nav link stay unlinked until the homepage owner or a follow-up changes them.
8. No migrations, no `lib/database.types.ts` changes, no new dependencies.

### Data shapes
```ts
type CommunityDetail = Pick<Tables<'communities'>, 'id' | 'name' | 'description' | 'created_at'> & {
  game: { name: string } | null
}
type CommunityPost = Pick<Tables<'posts'>, 'id' | 'title' | 'content' | 'created_at' | 'upvote_count'> & {
  authorUsername: string | null
  imageUrl: string | null
}
type MembershipRole = 'member' | 'moderator' | 'owner' | null
type JoinResult = { ok: true } | { ok: false; error: string }
```

### Auth
- Pages are public. `getCurrentUserProfile()` or `getClaims()` only decides which button to show.
- `joinCommunity` and `leaveCommunity` each check `getClaims()` and return "Please log in" when there is no user. RLS is the real guard: a user can only add or remove their own row.

### Database changes
None.

## Decisions
1. **Ownership:** issues #2, #15 and #16 have no assignees (checked on GitHub by the user, 2026-11-05). Assign yourself before opening the PR.
2. **Homepage:** leave `app/home-content.tsx` alone. The new pages are reachable at `/communities` and `/communities/[id]` by URL, and from the new header.
3. **Testing Join/Leave writes to the live project.** Use a `[TEST]` community and a test account, and leave the membership state as you found it.

## Verification
Checked in a sandbox with no access to Supabase or Google Fonts:
- `npm run lint`: passes.
- `npx tsc --noEmit`: passes after `npx next typegen`.
- `npm run dev` with placeholder Supabase env vars: `/communities` renders with its "could not be loaded" message, `/communities/not-a-uuid` returns 404, and a well-formed but unknown-to-the-sandbox id shows the community error message instead of crashing.
- `npm run build`: NOT checked here (Google Fonts can't be downloaded in the sandbox). Run it on a machine with internet.

Still to check by a teammate against the live project (use a `[TEST]` community and a test account, and leave membership as you found it):
1. Signed out: `/communities` lists communities, `/communities/[id]` shows the community and its posts and a "Sign in to join" button, a made-up UUID shows 404.
2. Signed in, not a member: Join changes the button to Leave, the community now appears in `/posts/new`, and "Create post" shows on the community page.
3. Leave reverses step 2. An owner sees "You own this community" and no Leave button.
4. Spoiler and NSFW posts do not appear on the community page.
5. Join while signed out of another tab (expired session) shows the error text and does not crash.
6. `npm run build`.

## Notes
- No other branch on the repo touches communities (checked 2026-11-05).
- The new header duplicates the homepage's header markup for now. A follow-up could make the homepage use the shared component.
