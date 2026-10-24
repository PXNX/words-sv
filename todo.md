# TODO

- [ ] Make the repository build without any `.env` variables set.
  - Ensure build-time code does not require `DATABASE_URL`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, or `PUBLIC_SITE_URL`.
  - Keep runtime-only features failing gracefully when those variables are missing.
  - Verify with a clean environment that has no `.env` file: `npm.cmd run build`.
