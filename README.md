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
content/facts             Fact inventory with handbook page references
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
- An item can only be `live` with a `page_ref` and a reviewer sign-off (`review.reviewed_by`, `review.reviewed_at`). The lint enforces this.
- `source.reviewer_note` is internal and is stripped before anything ships.
- "Correct" means "matches the handbook", even where the handbook is out of date.
- The handbook file itself must never be committed (`.gitignore` blocks `*.pdf`, `*.epub` and `handbook/`).

## Deploy (Cloudflare Pages)

- Build command: `pnpm install --frozen-lockfile && pnpm build:site`
- Build output directory: `apps/site/dist`
- Environment variable: `NODE_VERSION=22`
- Custom domain: `waymarkprep.co.uk`; add `waymarkprep.com` and `waymarkprep.org` as redirects (301) to it.
