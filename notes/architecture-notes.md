# Reminder delivery architecture notes

The app will retain static SvelteKit output and its explicit application rewrites. Vercel documents root `api/` functions as independently invoked server-side handlers, while `vercel.json` route ordering may preserve filesystem handling before the narrow static rewrites. The deployment therefore keeps the existing filesystem-first route followed only by the four static application paths; subscription and reminder handlers remain under `/api/` and are not caught by the static fallback.

The externally invoked reminder endpoint accepts only `GET` or `POST` and requires `Authorization: Bearer <CRON_SECRET>`. It must be idempotent. A third-party scheduler can invoke it hourly; Vercel’s own scheduled-job configuration is deliberately not used.

The browser receives the public VAPID key only through a public-key endpoint. The VAPID private key, VAPID subject, and cron secret remain environment-only server values. Persistent subscriptions and streak state require a server-side database; no user-specific reminder state may be inferred solely from a closed browser.

## Sources

- [Vercel Functions](https://vercel.com/docs/functions)
- [Static Configuration with `vercel.json`](https://vercel.com/docs/project-configuration/vercel-json)
