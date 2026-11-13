# Create a post: match the homepage look

**Status:** READY FOR PR
**Issue:** #3 (follow-up to the original Create a post PR)
**Branch:** feature/create-a-post-restyle

## Scope
Problem: `/posts/new` still has the old look. It has no site header, so there's no way back to Home, Communities, or your profile, and no Log out. Its colors (Tailwind `amber-400`, `zinc-800` borders, `bg-[#07080b]`) don't match the homepage's Faction palette.

Done when:
- `/posts/new` has the same header as the community pages (Faction crest, Home, Communities, your name, Log out).
- It has the homepage footer (top border, crest, "Play better, together.").
- Panels, borders, inputs, the dropdown, the tabs, and the Post button use the homepage's colors and shapes.
- The rules box is titled "Posting Rules", has a gold (`#e9b74e`) outline, and no longer lists "Remember the human" (four rules left).
- Creating a post works exactly as before.

Out of scope:
- Any change to how a post is created (checks, upload, Server Action, database).
- Header search (`SiteHeader` leaves it out because search isn't built yet).
- Adding the footer to the community pages.
- Moving the homepage onto the shared header (its own copy stays, as `SiteHeader`'s comment says).
- Flair, spoiler, and NSFW controls; video upload.

## What exists
- `components/site-header.tsx`: the homepage header without search, used by `/communities` and `/communities/[id]`. Its `active` prop only accepts `'communities'`.
- `components/logout-button.tsx`: used by `SiteHeader`.
- `lib/communities/queries.ts` `getViewer()`: returns `{ userId, displayName }` or null, using `getClaims()`.
- `app/home-content.tsx`: the source of the palette and the footer markup.
- No shared footer component yet.

Homepage styles to reuse:
| Element | Classes |
|---|---|
| Page | `min-h-screen bg-[#07090b] text-[#f4f1eb]`, main `mx-auto max-w-6xl px-5 py-9` |
| Eyebrow | `text-xs font-semibold tracking-wider text-[#e9b74e]` |
| Panel | `rounded-xl border border-[#292d34] bg-[#101319]` |
| Gold callout | `rounded-xl border border-[#493820] bg-[#17140f]`, heading `text-[#e9c980]` |
| Input / select | `rounded-lg border border-[#282c34] bg-[#11151b] focus:border-[#e9b74e] outline-none` |
| Primary button | `rounded-lg bg-[#e9b74e] px-3 py-2 font-semibold text-black` |
| Secondary button | `rounded-lg border border-[#30343b] px-3 py-2 hover:bg-[#171b22]` |
| Status banner | `rounded-lg border border-[#5c4426] bg-[#211a11] text-[#e7c788]` |
| Footer | `mt-10 border-t border-[#1e2228] px-5 py-7` |

## Plan
1. `components/site-header.tsx`: make `active` optional (`active?: 'communities'`), so pages with no matching nav item can use it. No visual change for existing pages.
2. `components/site-footer.tsx` (new): the homepage footer as a Server Component, with props `{ viewer: { displayName: string } | null }` (shows "Browsing as a guest" when null, like the homepage).
3. `app/posts/new/page.tsx`:
   - Use `getViewer()` for the auth check (still `getClaims()`, still redirects to `/login`) so the header gets the display name.
   - Wrap the page in the homepage shell: `SiteHeader`, `main`, `SiteFooter`.
   - Restyle the eyebrow, heading, "join a community first" panel (with a "Browse communities" button), and the rules sidebar.
   - Rules sidebar: rename "Posting to a community" to "Posting Rules", outline it in gold (`border-[#e9b74e]` on the `bg-[#17140f]` callout), and remove "Remember the human" from `POSTING_RULES`.
4. `app/posts/new/create-post-form.tsx`: class changes only. The dropdown and inputs use the input style, the tabs use the gold active border, the body sits in a panel, and Post uses the primary button with "Remove image" and the file picker as secondary buttons. The error and success banners match the homepage banner. No logic changes.

Mockup decisions (from the before/after mockup, pending approval):
- Eyebrow text changes from "CREATE POST" to "SHARE WITH YOUR FACTION" (the heading already says "Create post").
- A secondary "Cancel" button next to Post, linking to `/`.
- The hint "♙ Select a community to post." moves to the left of the buttons.
- Tabs become underlined text tabs (gold when active), not boxed tabs.
- Post becomes the homepage's square-cornered gold button, not a pill.
- Empty state: "You haven't joined a community yet" with a "Browse communities" button to `/communities`.
- The error message keeps a red style (the homepage has no error banner), and the success message uses the homepage's gold status banner.

Data shapes: unchanged. `CreatePostForm` props stay `{ userId, communities }`.

Auth: unchanged. The page redirects signed-out visitors, and `createPost` checks again.

Database changes: none. New dependencies: none.

## Verification
Automated: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

Manual test script (`npm run dev`, then http://localhost:3000). Needs two accounts: A has joined at least one community, B has joined none. Keep a test image under 5 MB, one over 5 MB, and a non-image file (for example a .pdf) handy.

Look and layout (account A, `/posts/new`):
1. Header shows the crest, Home, Communities, your name, and Log out. Neither Home nor Communities is highlighted.
2. Footer shows at the bottom with a top border.
2a. The rules box is titled "Posting Rules", has a gold outline, and lists four rules (no "Remember the human").
3. Click the dropdown, title, and body: each gets a gold border on focus.
4. Click Images, then Text: the gold underline moves and the title you typed is kept.
5. Narrow the window to phone width (about 375px): rules box drops below the form, header wraps, nothing scrolls sideways.
6. Header links: Home goes to `/`, Communities to `/communities`, your name to `/profile`. Cancel goes to `/`.

Creating posts still works (account A):
7. Post stays disabled until a community is picked and the title has non-space text.
8. Text post: pick a community, add a title and body, Post. The button says "Posting...", then the success banner shows and the form clears. The post appears on the homepage feed and the community page.
9. Image post: pick an image under 5 MB, check the preview, Post. The image shows on the homepage feed.
10. Remove image: pick an image, click Remove image, the preview goes away.

Error paths (account A):
11. Pick the .pdf: "Images must be PNG, JPEG, WebP, or GIF."
12. Pick the image over 5 MB: "Images can be up to 5 MB."

Other states:
13. Account B: the empty state shows, and Browse communities goes to `/communities`.
14. Log out from the header on `/posts/new`: you land on `/` signed out. Then open `/posts/new` directly: you're sent to `/login`.
15. Regression: `/communities` and a community page look the same as before (header unchanged, no footer added).

Results:
- 2026-11-13: `npm run lint` passed, `npx tsc --noEmit` passed (after `next build` generated route types), `npm run build` passed.
- 2026-11-13, in the browser with `npm run dev`, signed in as an account in one community:
  - Passed: 1, 2, 2a, 3 (gold focus border), 4 (title kept across tabs), 5 (375px: header wraps, rules below the form, no sideways scroll), 6 (link targets: Home `/`, Communities `/communities`, name `/profile`, Cancel `/`).
  - Passed: 7 (Post disabled with no community and with a spaces-only title, enabled once both are set; hint disappears when a community is picked).
  - Passed: 10 (preview shows, Remove image clears it), 11 (.pdf error), 12 (6 MB file error). Test files were generated in the page, not real uploads.
  - Passed: 14, signed-out half (`/posts/new` redirects to `/login`). 15 (`/communities` header unchanged, Communities still gold, no footer).
  - Not run: 8 and 9 (real text and image posts write to the shared Supabase project; skipped by decision, since the submit logic in `handleSubmit` and `createPost` is unchanged), 13 (needs an account with no communities), 14 log-out click (would end the test session; `LogoutButton` is the same component the community pages use).

## Notes
