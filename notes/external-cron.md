# Reminder scheduler and API server

The endpoints in `server/` run as one long-running Bun process (`bun server/main.ts`) next to their PostgreSQL database, in a container on the server. The web app on Vercel has a single function, `api/proxy.ts`, which forwards every `/api/*` request to that server. The API server applies `database-schema.sql` (idempotent) on every start and runs the reminder job itself once an hour, so no outside scheduler is needed. The job can still be triggered by hand:

```sh
curl --fail --silent --show-error \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://words-sv.vercel.app/api/cron/reminders"
```

The endpoint accepts `GET` or `POST`. It rejects missing or incorrect bearer credentials with `401`, returns no secret material, and is idempotent per device, local date, and reminder type. Without `CRON_SECRET` the server picks a random one at start, so only its own hourly run is authorized.

## Deployment variables

On Vercel only `API_ORIGIN` is needed: the public base URL of the API server (without `/api`). The API server reads the rest from its environment file. Do not commit them or expose the private key in client code.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection used for device state, subscriptions, sync and delivery deduplication. |
| `PORT` | Optional; the port the API server listens on (default `3791`). |
| `VAPID_SUBJECT` | VAPID contact subject used by the push sender. |
| `VAPID_PUBLIC_KEY` | Public key returned only to the browser when a user explicitly enables reminders. |
| `VAPID_PRIVATE_KEY` | Server-only VAPID signing key. |
| `CRON_SECRET` | Optional; bearer token for triggering the reminder job by hand. |
| `TELEGRAM_BOT_TOKEN` | Token of @word_circle_bot; the cron and invite thanks send messages through the Bot API with it. |
| `TELEGRAM_BRIDGE_SECRET` | Long random bearer token the ptb-words bot sends to `/api/telegram/start` (the same value in the bot's `.env`). |
| `TELEGRAM_BOT_USERNAME` | Optional; defaults to `word_circle_bot`, used to build the `t.me` links. |
| `APP_URL` | Optional; defaults to `https://words-sv.vercel.app`, opened by the button under Telegram messages. |

## Delivery rules

The scheduler sends at most one `new_day` reminder during the first two hours of a user’s local day when their prior day was qualified. It sends at most one `deadline` reminder when a qualifying streak is at risk and 1–120 minutes remain before that user’s local midnight. Expired push subscriptions are disabled after a `404` or `410` response.

## Telegram

Players can also link @word_circle_bot in the settings: the app asks `/api/telegram/device` for a one-time `t.me/word_circle_bot?start=r_<code>` link, the ptb-words bot (which keeps polling for every update) forwards that `/start` to `/api/telegram/start`, and from then on the same hourly run sends the `deadline` reminder as a Telegram message too, once per local day, independent of push. A player who blocks the bot (`403`) is switched off.

Every player also has a stable invite link, `t.me/word_circle_bot?start=i_<code>`. Each Telegram user who starts the bot through it for the first time earns the inviter 2 embers, with no limit; full sets forge freezes like the daily ember. Telegram users already linked to WordCircle and players inviting themselves do not count. The tables `wordcircle_telegram_links` and `wordcircle_telegram_invites` and the column `invite_freezes` are created on first use.
