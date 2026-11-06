# ptb-words

Telegram bot [@word_circle_bot](https://t.me/word_circle_bot) for the WordCircle language app
([words-sv](https://words-sv.vercel.app)).

- Opens WordCircle as a Mini App (menu button and `/start`).
- Takes **voluntary Telegram Stars donations** (`/spenden`, `/donate`, or the deep link
  `https://t.me/word_circle_bot?start=donate`). A donation unlocks nothing
  and is **never refunded**; `/paysupport` explains this, as Telegram requires for Stars payments.
- Links the legal pages that live in WordCircle: `/bedingungen`, `/datenschutz`, `/impressum`.
- `/set_cmd` (admins only) sets the profile photo (`bot/res/img/profile.jpg`), name, description and short description in German and English.

## Layout

| Path | What |
| --- | --- |
| `bot/` | python-telegram-bot app (long polling). Owns every update, including `pre_checkout_query` and `successful_payment`. |
| `bot/data/donations.db` | SQLite donation ledger (git-ignored; kept for tax retention). |
| `miniapp/` | Donation Mini App on [Telegram Serverless](https://core.telegram.org/bots/serverless): static page in `web/`, endpoints `me` and `donate` in `tgcloud/endpoints/`. |
| `ptb-words.container` | Podman quadlet for `nyx`. |

Why the split: Serverless hosts the Mini App front-end and verifies `initData` before an endpoint runs,
so `me` is the whole login and `donate` can create an invoice link for the verified user. The bot on
`nyx` keeps polling for updates and deletes any Serverless webhook on start, so the two never compete
for updates. The `miniapp` project therefore has no `handlers/`.

## Run locally

```sh
python -m venv venv && venv\Scripts\pip install -r bot\requirements.txt
copy example.env .env   # fill in TELEGRAM
run.bat
venv\Scripts\python -m pytest test
```

## Deploy the bot on nyx

```sh
ssh nyx@mn
git clone https://github.com/<owner>/ptb-words ~/projects/ptb-words
cp ~/projects/ptb-words/example.env ~/projects/ptb-words/.env   # set TELEGRAM, ADMINS
ln -sf ~/projects/ptb-words/ptb-words.container ~/.config/containers/systemd/
systemctl --user daemon-reload && systemctl --user start ptb-words
```

Updates: push, then `ssh nyx@mn "cd ~/projects/ptb-words && gh repo sync && systemctl --user restart ptb-words"`.

## Deploy the Mini App on Telegram Serverless

Serverless is still behind a waitlist for this bot. Until it is enabled, `MINIAPP_URL` stays empty,
`/start` shows only the WordCircle button and donations run through the bot chat.

1. @BotFather → the bot → enable **Serverless** and copy the CLI token (`app<id>:<secret>`).
2. `cd miniapp && npm install && npx tgcloud login` (or set `TGCLOUD_TOKEN`).
3. `npm run deploy` — prints `https://app<id>.tgcloud.ai/`.
4. Put that URL into `MINIAPP_URL` in `.env` on nyx and restart `ptb-words`. `/start` then shows a
   "Spenden-App öffnen" button.

Enabling Serverless may point the bot's webhook at Telegram's platform; the bot removes it again on
start (`delete_webhook`) so polling keeps working. Don't run `npx tgcloud webhook sync` while the bot
runs on nyx.
