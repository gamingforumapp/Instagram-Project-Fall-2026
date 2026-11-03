# Homepage

**Status:** READY FOR PR (design and crest approved; real sign-in and Create post navigation tested; Issue #29 created)
**Issue:** #29
**Branch:** feature/homepage

## Scope
Problem: The homepage on `main` is a simple welcome page, with no way to browse communities or posts.

Done when: Guests can browse public communities and posts in the dark-and-gold design, and signed-in users can reach their profile and the create-post page from it.

Out of scope:
- Working Like and Comment (shown disabled with "Coming soon"). Comments are in PR #28.
- Spoiler and NSFW blur (issue #10). These posts stay out of the feed for now.
- Real search (issues #9, #17, #18, #19). The search box filters what is already loaded.
- Community pages and joining (issues #2, #15, #16). Community cards don't link anywhere yet.
- Gamer suggestions.

## What exists
- Reused: `getCurrentUserProfile()` in `lib/profile/queries.ts`, `lib/supabase/client.ts` and `server.ts`, `/profile`, `/profile/[username]`, `/posts/new`, `/login`, `/signup`.
- The init migration already lets signed-out visitors read `communities`, `posts`, and `profiles`, and the `post-images` bucket is public.

## Plan
1. `app/components/guest-home.tsx`: add the component from the local backup unchanged, to keep the original in history.
2. Move it to `app/home-content.tsx`, next to its page like `app/profile/profile-content.tsx`.
3. `app/page.tsx`: keep the team's profile logic and add the community and post queries.
4. `app/home-content.tsx`: add the signed-in experience and the fixes under Notes.
5. `public/faction-crest.svg`, `app/favicon.ico`, `app/home-content.tsx`: replace the placeholder chess rook and the starter favicon with the official crest.

### Data shapes
```ts
type HomePost = Pick<Tables<'posts'>, 'id' | 'title' | 'content' | 'created_at' | 'upvote_count'> & {
  authorUsername: string | null
  imageUrl: string | null
}

type HomeViewer = { displayName: string }
```

### Auth
- Page: `getCurrentUserProfile()`, which uses `getClaims()`. The page is public, so no redirect.
- Log out: `supabase.auth.signOut()` in the browser, the same way as `app/profile/profile-content.tsx`. The backup's `/auth/signout` route was not brought over.

### Database changes
None.

### New dependencies
None.

## Verification
Lint, `npx tsc --noEmit`, and `npm run build` all pass.

Checked in Chrome against the live Supabase project (read only), with no console errors or failed requests:
- Signed out: communities, 5 posts, and an image from the `post-images` bucket all load.
- Signed out: Create post and Explore gamer profiles open the sign-up popup, and Close dismisses it.
- Like and Comment are disabled and show "Coming soon".
- Search filters posts, an empty search shows a message, and sort keeps all posts.
- HTML in a post body shows as plain text.
- At 390px and 320px wide there is no sideways scrolling.
- The crest loads at 32px in the header and 20px in the footer, with the FACTION text kept, at desktop and phone widths.
- `/favicon.ico` serves the crest icon.
- `?preview=signed-in` in development shows the signed-in layout with links to `/profile` and `/posts/new`.

Preview guard, checked with `next start` on the production build:
- With no `VERCEL_ENV`: `?preview=signed-in` is ignored and the visitor stays a guest.
- With `VERCEL_ENV=preview`: `?preview=signed-in` shows the fake profile.

Checked by hand with a real account on localhost (2026-11-03, by Enrique):
- Sign in works.
- The homepage loads correctly.
- The user's profile can be opened.
- Sign out works.
- While signed in, the homepage's Create post button opens the post creation page. No post was published.

Not checked:
- The `/profile/{username}` link from a post. None of the 8 live profiles has a username, so it never shows.
- The spoiler filter on a real spoiler post. The live project has none, and no test row was added.
- A failed Supabase request showing the error message.
- An actual Vercel preview or production deployment.
- The favicon in a visible browser tab. The tests ran in headless Chrome.

## Notes
- Fixes made to the backup version: login check, hand-written types, hydration-safe dates, plain error messages, spoilers hidden, and the temporary `console.log` removed.
- `posts` reaches `profiles` both directly and through `post_votes`, so the query must use `profiles!posts_author_id_fkey`. TypeScript accepted the short form, but the live database rejected it.
- Dates use UTC so the server and browser match. A post can show one day off from the reader's local date.
- Images use a plain `<img>`, since `next/image` would need a `next.config.ts` change. Worth revisiting.
- Like and Comment are disabled for guests too, and the popup no longer promises them.
- `public/faction-crest.svg` is the Figma export, unchanged. It is a 347×337 PNG inside an SVG, about 97 KB, with opaque tan corners. A CSS `clip-path` hides the corners on the page, and `app/favicon.ico` is a copy with transparent corners. A re-export with no background, as real vector shapes, would let the clip go.
- The homepage shows the `[TEST]` posts and test communities on the live project. Remove them before launch, with the team's agreement.
