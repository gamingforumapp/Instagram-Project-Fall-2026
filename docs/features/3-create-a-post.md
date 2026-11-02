# Create a post

**Status:** READY FOR PR (live Supabase checks still open, see Verification)
**Issue:** #3
**Branch:** feature/create-a-post

## Scope
Problem: Community members have no way to share text or images.

Done when: A signed-in user can pick a community they have joined and publish a post with a title, optional body text, and one optional image.

Out of scope (deferred, a teammate will pick these up):
- Community feed (issues #15 and #16)
- Search (issues #9 and #19)
- Anything else not directly related to creating a post

Out of scope (separate PRs):
- Video upload, with its migration for the `clips` table and bucket
- Edit or delete your own post
- Subposts (not defined yet)

Out of scope (shown in the design, parked):
- Link and Poll post types
- Tags (issue #10)
- Save Draft and autosave
- Reply notifications
- Rich text toolbar and Markdown switch
- Site header and search

## What exists
- `posts`: insert grants and RLS exist. `title` is limited to 200 characters, `content` to 40,000, and `image_path` holds one path.
- `community_members`: signed-in users can read memberships and can join as themselves. The database adds a community's creator as its owner.
- `post-images` bucket in the init migration: public, 5 MB limit, PNG, JPEG, WebP, and GIF. Users can upload to, read, and delete from their own folder. Not yet confirmed on the live project.
- `lib/supabase/client.ts` and `server.ts`: typed clients to reuse.
- `app/login/page.tsx`: the closest client form pattern.
- Missing: any UI to join a community. That is issue #2, which has no assignee or branch.

## Plan
1. `supabase/migrations/<timestamp>_require_membership_to_post.sql`: replace the "Users can create posts as themselves" policy (see Database changes).
2. `docs/database/schema.dbml`: add the membership rule to the `posts` note.
3. `lib/posts/actions.ts`: add the `createPost` Server Action.
4. `app/posts/new/page.tsx`: add the Server Component that checks auth and loads the user's communities.
5. `app/posts/new/create-post-form.tsx`: add the Client Component with the form, image upload, and result messages.
6. `app/page.tsx`: add a "Create a post" link so the page can be reached.

### Data shapes
Page query, for the signed-in user:

```ts
supabase
  .from('community_members')
  .select('communities(id, name)')
  .eq('user_id', userId)
```

Server Action input and result:

```ts
type CreatePostInput = {
  communityId: string
  title: string
  content: string
  imagePath: string | null
}

type CreatePostResult = { ok: true } | { ok: false; error: string }
```

Form props: `{ userId: string; communities: Pick<Tables<'communities'>, 'id' | 'name'>[] }`

### Submit flow
1. The form checks the required fields and the image's type and size.
2. The browser uploads the image to `post-images` at `{userId}/{randomUUID}.{ext}`. Server Actions are capped at 1 MB by default, so the file can't go through one.
3. The form calls `createPost` with the image path.
4. If the action fails, the browser deletes the uploaded file so it doesn't count against storage.
5. If it succeeds, the form clears and shows a success message.

### Validation in `createPost`
- Title is not blank after trimming and is at most 200 characters.
- Content is at most 40,000 characters.
- `communityId` is present, and the user is a member of that community.
- `imagePath`, if present, starts with `{userId}/`.
- `author_id` comes from the session, never from the input.

### Auth
- Page: `getClaims()`. Signed-out users are redirected to `/login`.
- `createPost`: `getClaims()` again, returning an error if signed out.
- Database: RLS checks the author and, after the migration, membership.

### Database changes
No table or column changes, so `lib/database.types.ts` doesn't change.

```sql
drop policy "Users can create posts as themselves" on public.posts;

create policy "Users can create posts as themselves"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      community_id is null
      or exists (
        select 1 from public.community_members as m
        where m.community_id = posts.community_id
          and m.user_id = (select auth.uid())
      )
    )
    and (
      flair_id is null
      or exists (
        select 1 from public.community_flairs as f
        where f.id = posts.flair_id
          and f.community_id = posts.community_id
      )
    )
  );
```

Profile posts (`community_id` is null) stay allowed because the schema and issue #7 use them. This page doesn't create them.

### New dependencies
None.

## Verification
Checked against the live Supabase project, signed in as a test account with one membership:
- Signed out: `/posts/new` redirects to `/login`.
- The picker lists only the community the user has joined.
- A post with a title only saves, shows a success message, and clears the form.
- A post with a title and body saves with the right author, community, and text.
- A post with an image saves. The file is in the user's folder, `image_path` matches it, and its public URL returns the image.
- Wrong file type and an image over 5 MB show an error and upload nothing.
- Non-member, by forcing another community's ID into the picker: rejected with "Join this community before posting in it." and no row saved.
- Non-member with an image: rejected, the upload is deleted, and its public URL no longer returns the file.
- HTML in the body is stored as plain text, so whatever displays posts must not render it as HTML.

Checked earlier with placeholder Supabase values and a temporary preview route, since removed:
- Signed out: submitting the form returns "Please log in to create a post."
- Post button stays disabled with no community or a blank title. The title input stops at 200 characters.
- A failed upload shows an error and keeps what the user entered.

Bug found and fixed in testing: after a successful post, picking a bad file left the old success message on screen.

Test method: form fields and files were set by script in the browser, so the native file picker hasn't been clicked.

Not checked:
- No memberships: the "join a community first" message. Needs a second account.
- @mention notifications. Needs a second account with a username.
- After the migration runs: a direct database insert by a non-member is rejected, and one by a member succeeds.

Test data still on the live project: the two test communities and five `[TEST]` posts, one with an image.

## Notes
- Added `lib/posts/constants.ts`, which wasn't in the plan: files marked `'use server'` can only export async functions, so the shared limits live there.
- The design's title counter shows 300, but the database allows 200. The page will use 200.
- Testing needs a community and a membership on the live project. Until issue #2 ships, someone has to add them in Supabase.
- `createPost` also checks membership, so non-members get a clear error and the rule holds before the migration runs. RLS is the rule that can't be bypassed.
- PR #24 also changes `app/page.tsx`, so the link in step 6 may need a small merge fix.
