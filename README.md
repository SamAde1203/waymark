# Waymark

Independent Life in the UK test preparation: web first (waymarkprep.co.uk), then Android and iOS.

> Waymark is an independent study app. It is not affiliated with or endorsed by the UK Government, the Home Office, PSI or TSO.

## Layout

```
apps/site                 Public website (Astro, static): home, free practice test, guides, legal pages
apps/mobile-web           Study app (Expo: web now, Android/iOS later) — next milestone
packages/content-schema   Zod schema for facts and questions + content lint
packages/shared           Exam engine: scoring, mock builder, readiness bands, FSRS scheduling
content/items             Question bank (JSON, original wording only)
content/facts             Fact inventory with handbook chapter and section references
```

## Commands

```bash
pnpm install
pnpm test            # engine and schema tests
pnpm content:check   # validate every question file
pnpm dev:site        # http://localhost:4321
pnpm build:site      # static output in apps/site/dist
```

## Content rules

- Write every question and explanation in original words. Never paste handbook text into `content/`.
- References are chapter + section heading, exactly as printed (headings match in print and Kindle). Page numbers are optional.
- An item can only be `live` once a reviewer has checked the heading in their copy (`source.section_confirmed: true`) and signed it off (`review.reviewed_by`, `review.reviewed_at`). The lint enforces this.

## Review workflow

1. Claude drafts items in `content/items/` with `status: "draft"` and the section heading it expects.
2. The reviewer opens that section in the handbook, checks the answer and the heading wording, and fixes either if needed.
3. Set `section_confirmed: true`, fill `review.reviewed_by` / `review.reviewed_at`, and change `status` to `live`.
4. `pnpm content:check` must pass before committing.
- `source.reviewer_note` is internal and is stripped before anything ships.
- "Correct" means "matches the handbook", even where the handbook is out of date.
- The handbook file itself must never be committed (`.gitignore` blocks `*.pdf`, `*.epub` and `handbook/`).

## Deploy (Vercel — must be a Pro team: Hobby forbids commercial use)

- Import the `waymark` repo as a new project.
- Root Directory: `apps/site` (Vercel installs the pnpm workspace from the repo root automatically).
- Framework preset: Astro. Build command: `astro build`. Output directory: `dist`.
- Node.js version: 22 (Project Settings → General).
- Domains: add `waymarkprep.co.uk` as primary; add `www.waymarkprep.co.uk`, `waymarkprep.com` and `waymarkprep.org` and set each to redirect (308) to it.

## Deploy (alternative: Cloudflare Pages, free plan allows commercial use)

- Build command: `pnpm install --frozen-lockfile && pnpm build:site`
- Build output directory: `apps/site/dist`
- Environment variable: `NODE_VERSION=22`
- Custom domain: `waymarkprep.co.uk`; add `waymarkprep.com` and `waymarkprep.org` as redirects (301) to it.
