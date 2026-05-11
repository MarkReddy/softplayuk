# softplayuk.co.uk — Operating Manual

This file is the source of truth for how Claude (and any future Claude model) should behave when working on this repository. Read it before doing anything. Keep it short, keep it current.

## Mission

Build the UK's most useful soft-play directory. Long-term moat is **indexed pages × first-party content × parent-trusted reviews**. We are a content/SEO play, not a marketplace and not a SaaS.

## Current phase

**Phase 0 — Foundations (technical perf + indexability).** Pre-traffic (< 1k sessions/mo), pre-revenue. 6-month goal is the moat (traffic + content); monetisation work is deferred. See `docs/strategy.md` for the full roadmap.

## Operating mode

**Advisory.** Claude drafts plans, PRs, content, SQL diffs. The owner reviews, merges, deploys, and runs anything commercial. This will graduate to direct-execute after several clean rounds. Until then:

- Work on feature branches only. Never push to `main`.
- Open PRs as drafts. The owner merges.
- Do not run anything that costs money (paid AI inference beyond local dev, paid APIs, paid ads, paid SaaS) without explicit say-so in the same session.
- Do not contact anyone (venues, customers, press) as Claude.

## Hard guardrails (never do without explicit OK in the current session)

- Schema migrations against production Neon. Migrations live in `scripts/` and run against a branch DB first.
- Force-push, `git reset --hard` on shared branches, branch deletion.
- Edits to `robots.ts`, `sitemap.ts` that change indexability of public pages.
- Edits to `.env*`, Vercel project settings, DNS, domain config.
- Anything in `app/api/admin/*` that mutates production data (backfills, ingestion).
- Bulk deletes, bulk updates, anything touching `venues.status`.
- Pricing changes if/when Stripe is added.
- Adding new third-party scripts (analytics, chat, A/B testing) to the public site.
- Disabling TypeScript checks, ESLint rules, or test suites to make a build pass.

## What Claude can do without asking

- Read anything in the repo, Vercel logs, runtime logs via the Vercel MCP.
- Run the test suite, the dev server, the build locally.
- Open draft PRs against any non-`main` branch.
- Refactor for clarity if the behaviour is preserved and tests pass.
- Add tests.
- Edit `docs/*`, `CLAUDE.md`, `README.md` — flag any change to this file in the PR description so the owner sees it.

## Tech stack at a glance

- Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.7.
- Tailwind 3 + shadcn/ui (Radix primitives) — UI components live in `components/ui`.
- Neon Postgres via `@neondatabase/serverless` — see `lib/db.ts`.
- Hosted on Vercel, production region should be `lhr1` (UK audience).
- Package manager: pnpm 10.x. Lockfile is `pnpm-lock.yaml`.
- Tests: Vitest. Run with `pnpm test`.

## Code conventions

- Prefer Server Components. Mark a component `'use client'` only when it genuinely needs browser APIs or hooks. Split client islands as small as possible.
- Default to ISR (`export const revalidate = N`) on data-driven routes. `force-dynamic` is a smell — it usually means a query needs caching, not a render strategy change.
- Database access: one query per list, not N+1. If you find a loop calling `await fetchVenueRelations(id)`, that is a bug — fix it with a batched query.
- Images: `next/image` everywhere on public pages. No raw `<img>` tags in `components/` or `app/` outside of admin views. Provide `width`/`height` and `sizes`.
- Types: no `any`. Use the existing types in `lib/types.ts` and extend rather than duplicating.
- Don't add new shadcn/ui components or Radix packages unless the page actually uses them. The `components/ui/` directory has dead weight to be pruned, not added to.
- Don't introduce new dependencies without flagging them in the PR description and a one-line justification.
- No comments that restate the code. Comments explain *why*, not *what*.

## Before opening a PR

1. `pnpm test` passes.
2. `pnpm build` completes locally with no new warnings.
3. Lighthouse pass on the affected route(s) — note the deltas in the PR description for any user-facing change.
4. PR description includes: what changed, why, what to test, any follow-ups created.

## Where to find context

- `docs/strategy.md` — 6-month plan and phase definitions.
- `docs/backlog.md` — current task list, phase-bucketed.
- `lib/db.ts` — all database queries. If a query isn't here, it shouldn't exist.
- `lib/types.ts` — domain types.
- `app/api/` — public API routes. `app/api/admin/` is owner-only, gated by `lib/admin-auth.ts`.
- `scripts/` — one-shot SQL and JS scripts. Numbered for ordering.

## Project facts that should not get re-derived every session

- Vercel team: `team_SDfk6TEq3ZDqIL8BwxRpRrAH` (slug: `mark-2408s-projects`).
- Vercel project: `prj_YNvaILC1gwlBocT82vH4PyJZKWWd` (`v0-yoink-soft-play`).
- Production domain: `softplayuk.co.uk` + `www.softplayuk.co.uk`.
- GitHub repo: `MarkReddy/softplayuk`, default branch `main`, public.
- Production deploys auto-trigger on push to `main` via Vercel's GitHub integration.

## Standing performance budget (Phase 0 target)

Public pages on a mid-tier mobile, throttled 4G:

- TTFB ≤ 600 ms (cached), ≤ 1500 ms (cold ISR).
- LCP ≤ 2.5 s.
- CLS ≤ 0.1.
- JS transferred on the homepage ≤ 150 KB compressed.

If a change pushes any of these into the red, it doesn't ship.

## Things to retire from the codebase, not extend

- `force-dynamic` on any public page.
- `images.unoptimized: true` in `next.config.mjs`.
- Loops over rows that call `fetchVenueRelations` per row in `lib/db.ts`.
- Unused shadcn/ui components and their Radix dependencies (carousel, drawer, calendar, sidebar, etc. — see perf review).
- Duplicate `globals.css` (`app/globals.css` vs `styles/globals.css`).
- `typescript.ignoreBuildErrors: true`.
