# View a single post

**Status:** VERIFYING
**Issue:** #43
**Branch:** feature/post-page

## Scope
Problem: There is no way to open one post. Feeds show posts, but nothing links
anywhere, and the comments feature (PR #28, issue #4) has no page to appear on.

Done when:
- `/posts/[id]` shows one post: title, full text, full-size image, author
  (linked to their profile), community (linked to its page), date, and vote
  count.
- The post's comments show below it, using `PostComments` from PR #28.
- Post titles in the homepage feed, profile feed, and community page link to
  the post's page.
- A post id that doesn't exist, or isn't a valid id, shows the 404 page.
- Signed-out visitors can read the post (the database already allows it).

Out of scope:
- Voting (issue #4, later), editing or deleting posts (issue #3).
- The blur for NSFW and spoiler posts (issue #10). Until it exists, those posts
  show the 404 page here, the same way the feeds leave them out.
- Live comment updates (needs a Realtime migration) and any fixes inside PR #28's
  own code. Those belong to PR #28's owner.

## What exists
- `components/post-card.tsx`: the post card used by the homepage and profile feeds.
- `app/communities/[id]/page.tsx`: draws its own post list (no `PostCard`).
- `app/page.tsx`, `lib/communities/queries.ts`: the post query to copy
  (`profiles!posts_author_id_fkey(username)`, `post-images` public URL).
- Database: "Anyone can view posts" and "Anyone can view comments" policies, so
  no migration is needed.
- PR #28 (not merged): `components/comments/post-comments.tsx`.

## Plan
1. `lib/posts/queries.ts` (new, starts with `import 'server-only'`)
   - `getPost(id)` loads one post with its author and community:
     `id, title, content, created_at, upvote_count, image_path,
     author:profiles!posts_author_id_fkey(username, display_name),
     community:communities!posts_community_id_fkey(id, name)`,
     filtered to `is_nsfw = false` and `is_spoiler = false`, using `.maybeSingle()`.
     Both foreign keys are named, because `posts` reaches `profiles` and
     `communities` in more than one way.
   - Turns `image_path` into a public URL from the `post-images` bucket, the same
     way the homepage does.
   - Returns `{ status: 'found', post } | { status: 'not_found' } | { status: 'error' }`,
     the same shape as `getCommunity`.
   - Type: `PostDetail = FeedPost & { author: { username, display_name } | null;
     community: Pick<Tables<'communities'>, 'id' | 'name'> | null }`.
2. `app/posts/[id]/page.tsx` (new Server Component)
   - `await params`. If the id isn't a UUID (`isUuid` from `lib/communities/ids.ts`),
     call `notFound()`.
   - Loads `getViewer()` (from `lib/communities/queries.ts`) and `getPost(id)`
     together. `not_found` calls `notFound()`. `error` shows a "could not be
     loaded" message.
   - Layout: `SiteHeader`, a "← Back" link to the post's community (or Home), then
     the post: community badge (links to `/communities/[id]`), title as `<h1>`,
     "by @username" and the date, full text, the image at full width, and the
     vote count as text.
   - The author links to their profile only when signed in, the same as the feeds
     do now. Signed-out visitors see the name without a link.
   - Below the post, a "Comments" section with a "Coming soon" note. This is where
     `<PostComments postId={post.id} currentUserId={viewer?.userId} />` goes once
     PR #28 merges.
   - Dates use the fixed `en-US`/UTC formatter.
3. `components/post-card.tsx`: the title becomes a link to `/posts/[id]`. This
   covers the homepage and profile feeds, since both use `PostCard`.
4. `app/communities/[id]/page.tsx`: the post title in `PostItem` becomes a link to
   `/posts/[id]`. This is a one-line edit to the communities feature, listed in
   the PR.

No database changes and no new dependencies.

Auth: anyone can read posts and comments (existing policies). The page uses
`getClaims()` (through `getViewer`) only to decide whether to show the profile
link and to pass the user id to the comments.

Testing with PR #28 (local only, nothing committed): combine this branch with
#28's branch, swap the "Coming soon" note for `<PostComments>`, and make #28 build
locally by moving its thread-nesting helper out of the server file. Then post,
reply to, and delete comments, signed in and signed out.

## Verification
Checked (Nov 15, on `feature/post-page`, signed out):
- `npm run lint`, `npx tsc --noEmit`, `npm run build` pass. `/posts/[id]` is in the build.
- A post without an image and a post with an image both load (200). The image
  comes from the `post-images` bucket.
- A random UUID and `/posts/abc` both show the 404 page.
- The author name shows without a link (signed out). A post whose author has no
  username shows their display name.
- The community badge and back link go to the post's community.
- Post links: 9 on the homepage, 8 on the Test Community page, and 1 on
  `/profile/tester`.
- Phone (390px) and desktop (1280px): no sideways scrolling, no console errors.

- Signed in (tested by Dominic): the author name on the post "test" by @tester
  links to `/profile/tester`, and the other checks above also pass in the browser.

Not checked yet:
- NSFW and spoiler posts: none exist in the database to try.
- With PR #28 combined locally.

## Notes
- Page title (the browser tab) stays the site default. Setting it to the post
  title can come later.
