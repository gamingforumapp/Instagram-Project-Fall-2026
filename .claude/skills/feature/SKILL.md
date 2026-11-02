---
name: feature
description: Build or resume one user story, from scope check through approved plan, implementation, and verification. Use when asked to start, plan, build, or continue a feature or GitHub issue in this repo. Takes an issue number, a short idea, or nothing to resume. Not needed for typo-level fixes.
---

# Feature Workflow

Scope → Plan → **Approval** → Build → Verify

Takes one story to a state that's ready for review. `AGENTS.md` still applies at every step, and this skill doesn't repeat its rules.

Never write feature code before the user approves the plan.

## Start or Resume

Each story has one working doc: `docs/features/{issue-number}-{slug}.md`. Use `{slug}.md` if there's no issue yet.

- **Issue number:** read it with `gh issue view {number}`. Its acceptance criteria are the requirements. If `gh` isn't available, ask the user to paste them.
- **Short idea:** ask whether an issue exists. If not, carry on, and suggest creating one before the PR.
- **No argument:** list the docs in `docs/features/` with their status and ask which to continue.
- **Doc already exists:** read it and check `git status` and the current branch. Tell the user where things stand, then continue from that status.

## Step 1: Scope

Ask these one at a time, and skip anything the issue already answers:

1. **What's the problem?** Who has it, and what does done look like?
2. **Does it already exist?** Check `app/`, `lib/`, open branches, and open PRs. Other teammates may be working on it.
3. **What's the smallest useful version?**
4. **What's out of scope?** Write this down. Discussion apps grow fast, so park notifications, DMs, reputation, and similar extras unless the story asks for them.

If this is really more than one story, propose a split. Each PR covers one story.

Create the doc and confirm the scope with the user before planning:

```markdown
# {Story title}

**Status:** SCOPING | PLANNING | BUILDING | VERIFYING | READY FOR PR
**Issue:** #{number}
**Branch:** {branch}

## Scope
Problem: ...
Done when: ...
Out of scope: ...

## What exists
## Plan
## Verification
## Notes
```

## Step 2: Plan

Read the code the story touches yourself. Before writing anything down, check:

- **Data:** `lib/database.types.ts` for exact columns and `docs/database/schema.dbml` for the design notes. Never guess at tables, columns, or buckets.
- **Next.js:** the relevant guide in `node_modules/next/dist/docs/`.
- **Patterns:** the closest existing page or flow, such as `app/login/page.tsx` and `lib/supabase/`.

Then fill in the doc:

- **What exists:** what to reuse and what's missing.
- **Plan:** ordered steps naming each file and what changes in it.
- **Data shapes:** queries, Server Action inputs, and component props. Use `Tables<'...'>` helpers.
- **Auth:** who can do this, and where each page, Server Action, or Route Handler checks it.
- **Database changes:** if any, the new migration, including RLS, grants, and policies.
- **New dependencies:** if any, with the reason. These need separate approval.
- **Verification:** how each acceptance criterion will be checked.

Keep the plan under 300 lines. If it won't fit, the story is too big, so split it.

**Stop and ask the user to approve the plan.** Summarize it in a few lines and call out any decision they need to make.

## Step 3: Build

1. Create a branch from an up-to-date `main` if you aren't on the story's branch: `feature/{slug}`.
2. Follow the plan in order, and set the status to BUILDING.
3. If the plan turns out to be wrong, stop and tell the user before changing direction. Record the change in the doc.

**If the story has a migration,** write the file, but don't run it. A teammate reviews it and runs it after merge. Until then, `lib/database.types.ts` won't include the new schema, so never edit it by hand. Discuss how to sequence this with the user, because code that depends on the migration may not typecheck until it has run. One option is a separate migration PR that goes first.

**After three failed attempts at the same problem,** stop. Tell the user what you tried and what you think is wrong, and add it to Notes.

## Step 4: Verify

Set the status to VERIFYING and run these checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

There's no test runner yet, and adding one needs the team's approval. Until then, run `npm run dev` and check each acceptance criterion in the browser, including the signed-out state and any failure paths. Record what you checked under Verification. It becomes the "how I checked this" section the PR requires.

Report results honestly. If something wasn't checked, such as a flow that depends on an unrun migration, say so.

## Step 5: Hand Off

Set the status to READY FOR PR and give the user:

- What changed, and each acceptance criterion with how it was checked
- Anything a teammate must do, such as running a migration, then `npm run db:types`, and updating `schema.dbml`
- A suggested PR title and description that reference the issue

Commit, push, or open the PR only when the user asks.

If the agent repeated a mistake during this story, suggest a line for "Things you got wrong before" in `AGENTS.md`.
