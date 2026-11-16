# Deployment

The web app is a static SvelteKit build. `vercel.json` at the repository root is the whole
deployment contract: Vercel installs with `bun install --frozen-lockfile`, runs `bun run build`,
serves `build/`, sends page paths to their `index.html` (the app routes on the client) and forwards
`/api/*` to the API server through `api/proxy.ts`. Pushing to `main` deploys; there is no manual
release step.

## Environment

The static app needs no secrets. The serverless API functions read the variables listed in
`.env.example` (`DATABASE_URL`, the VAPID keys and subject, `CRON_SECRET`, and optionally
`PUBLIC_SITE_URL`). Set them in the project's environment settings, not in the repository.
`VERCEL_PROJECT_PRODUCTION_URL` is provided by Vercel and used for Open Graph cards.

The API server next to the database and the Telegram bot run as long-lived containers elsewhere,
with their own secrets. Keep those out of the repository; the web app only ever talks to `/api/*`.

## Before you push

```bash
bun install --frozen-lockfile
bun run lint        # ESLint, via bun lint
bun run fmt         # bun fmt — formats the working tree
bun run fmt:check   # fails if a file is not formatted
bun run check       # svelte-check
bun run test        # Vitest
bun run build       # the same command Vercel runs
```

CI runs lint, type checks and tests on every change. Format with `bun run fmt` before committing so
the diff stays reviewable; `bun run fmt:check` uses the same formatter in check mode.
