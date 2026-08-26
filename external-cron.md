# External reminder scheduler

WordCircle intentionally has **no platform-managed cron configuration**. Instead, a scheduler you choose invokes the protected Vercel function at least once per hour:

```sh
curl --fail --silent --show-error \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://words-sv.vercel.app/api/cron/reminders"
```

The endpoint accepts `GET` or `POST`. It rejects missing or incorrect bearer credentials with `401`, returns no secret material, and is idempotent per device, local date, and reminder type. A safe scheduler cadence is hourly: this detects each device’s local new-day window and the final two hours before local midnight.

## Deployment variables

Configure these variables in the Vercel project’s production and preview environments. Do not commit them or expose the private key in client code.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Durable MySQL/TiDB connection used for device state, subscriptions, and delivery deduplication. |
| `VAPID_SUBJECT` | VAPID contact subject used by the push sender. |
| `VAPID_PUBLIC_KEY` | Public key returned only to the browser when a user explicitly enables reminders. |
| `VAPID_PRIVATE_KEY` | Server-only VAPID signing key. |
| `CRON_SECRET` | Long random bearer token for the external scheduler. |

## Delivery rules

The scheduler sends at most one `new_day` reminder during the first two hours of a user’s local day when their prior day was qualified. It sends at most one `deadline` reminder when a qualifying streak is at risk and 1–120 minutes remain before that user’s local midnight. Expired push subscriptions are disabled after a `404` or `410` response.
