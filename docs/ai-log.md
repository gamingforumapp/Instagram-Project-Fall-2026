# AI Log

This log records cases where an AI coding agent made a wrong assumption or invented something, how the team caught it, and what was changed to prevent it happening again. Add new entries at the top.

---

## 2026-11-03: Wrong assumption about the posts/profiles relationship

**Tool:** Claude Code (Claude Opus 5.5), VS Code extension
**Task:** Integrate the homepage redesign with the team's posts and profiles (issue #29, PR #30)
**Logged by:** Enrique Garcia (project manager), who directed the session

### What the AI assumed
Claude Code wrote the homepage feed query to include each post author's username through an embedded join:

```ts
supabase.from('posts').select('…, profiles(username)')
```

It assumed `posts` had only one relationship to `profiles`. The table and column names were all correct. The mistake was a wrong assumption about how the tables are related.

### What was actually true
`posts` connects to `profiles` in two ways:
- **Directly:** `posts.author_id` → `profiles.id`, through the foreign key `posts_author_id_fkey`.
- **Indirectly:** through `post_votes`, whose `post_id` and `user_id` columns link the two tables.

With two paths, Supabase can't tell which one the query means, so it rejects the query with error `PGRST201`: "more than one relationship was found".

### How it was caught
- TypeScript, ESLint, and `next build` all passed. None of them check this.
- Running the app locally against the project's Supabase database showed "Public content could not be loaded" instead of the feed.
- Running the same query directly against the database returned `PGRST201`, with a hint to name the relationship.

### Fix
Named the foreign key in the embed:

```ts
supabase.from('posts').select('…, profiles!posts_author_id_fkey(username)')
```

A code comment in `app/page.tsx` explains why. The fix is in commit `76edbab`, merged to `main` in PR #30. The incorrect version was caught during local testing, before it was committed, so it was never committed.

### Prevention
A rule in `AGENTS.md` covers this, in the Database section and as an entry under "Things you got wrong before". It says to name the foreign key when an embed's tables are connected in more than one way, and to run every new query against a real database before review.

### Verification status
- [x] The incorrect query and the `PGRST201` error are recorded in the local Claude Code session transcript
- [x] The fix is in commit `76edbab` on `main`
- [x] The live homepage feed loads (checked with a read-only request, November 6, 2026)
- [ ] The `AGENTS.md` prevention rule is committed. Added in this PR.
- [ ] Unverified: whether the course needs the session transcript itself as evidence, or whether this entry is enough
