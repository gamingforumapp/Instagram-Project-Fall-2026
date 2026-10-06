# AGENTS.md

This is the instruction file for every AI coding tool on the team (Claude Code, Antigravity, Copilot, etc.). `CLAUDE.md` only imports this file. Add new rules here, not to `CLAUDE.md`, `GEMINI.md`, or any other tool-specific file.

## Project
A social site for gamers: share posts and clips, review and discover games, and find people to play with.

## Stack
Frontend and server code: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
Database, auth, and file storage: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
Hosting: Vercel
Node.js: 24 LTS

## Commands
Install: npm install
Run locally: npm run dev (http://localhost:3000)
Build: npm run build
Lint: npm run lint
Test: no test runner yet. Ask before adding one.

## Rules
- One story per PR. Keep changes small.
- Once a test runner exists, write or update tests for every change. Until then, say in the PR how you checked the change.
- Never commit secrets, `.env`, or `.env*.local` files. `.env.example` (placeholder values only) is committed.
- Ask before adding a new dependency.
- Don't guess at existing Supabase tables, columns, or storage buckets. Check the Supabase dashboard or ask. If a story needs a new table, say so and write the SQL (with RLS, grants, and policies) for a teammate to review and run.

## Next.js 16
Your training data is likely out of date. Follow these:
- Use `proxy.ts` at the project root (next to `app/`), not `middleware.ts`. Export the function as `proxy`, not `middleware`, and don't add a `runtime` export.
- In server code (pages, layouts, Route Handlers, Server Actions, `generateMetadata`), `params`, `searchParams`, `cookies()`, and `headers()` are Promises. Always `await` them. Client Components can't be `async`: unwrap those props with React's `use()`, or use the `useParams()` and `useSearchParams()` hooks.

## Supabase
- Use `@supabase/ssr` (`createBrowserClient`, `createServerClient`). Never use `@supabase/auth-helpers-nextjs`.
- In `createServerClient`, use only the `getAll` and `setAll` cookie methods, never `get`, `set`, or `remove`. `setAll(cookiesToSet, headers)` gets cache headers as its second argument. In `proxy.ts`, set them on the response, or Vercel's CDN can serve one user's session to another. Create a new server client for every request.
- Env vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`), in both client and server code. The secret key (`sb_secret_...`) goes only in `SUPABASE_SECRET_KEY`, and is read only in a file that starts with `import 'server-only'` (built into Next.js, no install needed). Never put a `NEXT_PUBLIC_` prefix on a secret.
- Don't use the legacy key names `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`, or any key that starts with `eyJ`. The `anon` and `authenticated` Postgres roles in grants and policies are still correct.
- To check who is logged in on the server, use `supabase.auth.getClaims()`. The user id is `data.claims.sub`. Use `supabase.auth.getUser()` instead for sensitive actions (account settings, deleting data) that must reject a session that was signed out or banned. Never trust `getSession()` in server code. `proxy.ts` only refreshes the session, so check auth in every page, Server Action, and Route Handler that needs it.
- New tables in `public` are not exposed to the API automatically. Each one needs, in the same migration: RLS enabled, `grant`s, and policies. Grant each role only what it needs: `authenticated` gets the operations the app uses, `anon` gets only `select` on data signed-out visitors may see (often nothing), and `service_role` gets what server code using the secret key needs. Write one policy per operation (`for select`, `insert`, `update`, `delete`), and never add `using (true)` just to have a policy. Views also need grants, and must use `with (security_invoker = true)`.
- Storage (clips, images): `storage.objects` already has RLS on and needs no grants, but nothing can be uploaded until there are policies on `storage.objects` for that `bucket_id`. Uploading needs `insert`. Downloading or creating signed URLs needs `select`. Deleting needs `select` and `delete`. Overwriting needs `select`, `insert`, and `update`. Never alter the `storage` schema with SQL.

## Things you got wrong before
- (add a line every time the agent repeats a mistake)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
