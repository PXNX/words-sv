# ptb-words

Lives in the words-sv repository under `bot/` (its own history was merged in with it); the paths below are relative to `bot/`.

Telegram bot [@word_circle_bot](https://t.me/word_circle_bot) for the WordCircle language app
([words-sv](https://words-sv.vercel.app)).

- Opens WordCircle as a Mini App (menu button and `/start`).
- Takes **voluntary Telegram Stars donations** (`/spenden`, `/donate`, or the deep link
  `https://t.me/word_circle_bot?start=donate`). A donation unlocks nothing
  and is **never refunded**; `/paysupport` explains this, as Telegram requires for Stars payments.
- Links the legal pages that live in WordCircle: `/bedingungen`, `/datenschutz`, `/impressum`.
- Forwards the app's one-time `/start` links (`l_…` sign-in, `r_…` reminders, `i_…` invites) to
  WordCircle's `/api/telegram/start` and replies with the result. Needs `TELEGRAM_BRIDGE_SECRET`, the
  same value the app's server has.
- `/version` shows the WordCircle version (from the repository's `package.json`, or `APP_VERSION`
  when only `bot/` is deployed) with a link to its changelog entry.
- `/set_cmd` (admins only) sets the profile photo (`bot/res/img/profile.jpg`), name, description and short description in German and English.

## Layout

| Path | What |
| --- | --- |
| `bot/` | python-telegram-bot app (long polling). Owns every update, including `pre_checkout_query` and `successful_payment`. |
| `bot/store.py` | PostgreSQL donation ledger (`DATABASE_URL`; kept for tax retention). |
| `miniapp/` | Donation Mini App on [Telegram Serverless](https://core.telegram.org/bots/serverless): static page in `web/`, endpoints `me` and `donate` in `tgcloud/endpoints/`. |

Why the split: Serverless hosts the Mini App front-end and verifies `initData` before an endpoint runs,
so `me` is the whole login and `donate` can create an invoice link for the verified user. The bot
keeps polling for updates and deletes any Serverless webhook on start, so the two never compete
for updates. The `miniapp` project therefore has no `handlers/`.

## Run locally

```sh
python -m venv venv && venv\Scripts\pip install -r bot\requirements.txt
copy example.env .env   # fill in TELEGRAM and DATABASE_URL
run.bat
set TEST_DATABASE_URL=postgresql://...   # an empty database, for the ledger test
venv\Scripts\python -m pytest test
```

## Deploy the bot

The bot is a long-running process (`python main.py` in `bot/`, see `run.bat`) next to a PostgreSQL database;
it creates its table on start. It needs `.env` with `TELEGRAM`, `ADMINS`, `DATABASE_URL` and `TELEGRAM_BRIDGE_SECRET` (see
`example.env`). After pulling new code, restart it: the code is only read at start-up.

## Deploy the Mini App on Telegram Serverless

Serverless is still behind a waitlist for this bot. Until it is enabled, `MINIAPP_URL` stays empty,
`/start` shows only the WordCircle button and donations run through the bot chat.

1. @BotFather → the bot → enable **Serverless** and copy the CLI token (`app<id>:<secret>`).
2. `cd miniapp && npm install && npx tgcloud login` (or set `TGCLOUD_TOKEN`).
3. `npm run deploy` — prints `https://app<id>.tgcloud.ai/`.
4. Put that URL into `MINIAPP_URL` in the bot's `.env` and restart the bot. `/start` then shows a
   "Spenden-App öffnen" button.

Enabling Serverless may point the bot's webhook at Telegram's platform; the bot removes it again on
start (`delete_webhook`) so polling keeps working. Don't run `npx tgcloud webhook sync` while the bot
is running.
