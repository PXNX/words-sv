import { api, EndpointError } from 'sdk';
import { CURRENCY, TERMS_URL, TIERS, buildPayload } from '../lib/donations.js';

// POST /api/donate — creates a Stars invoice link for the verified caller; the page opens it
// with Telegram.WebApp.openInvoice. The Python bot answers the pre-checkout query and records it.
export default async function (input, ctx) {
  const user = ctx.initData.user;
  const amount = Number(input.amount);
  if (!user) throw new EndpointError('No Telegram user in init data', { code: 'NO_USER' });
  if (!TIERS.includes(amount)) throw new EndpointError('Unsupported amount', { code: 'BAD_AMOUNT', tiers: TIERS });
  const german = (user.language_code ?? '').startsWith('de');
  const link = await api.createInvoiceLink({
    title: german ? 'Spende an WordCircle' : 'Donation to WordCircle',
    description: german
      ? `Freiwillige Spende über ${amount} Stars ohne Gegenleistung. Keine Rückerstattung. Bedingungen: ${TERMS_URL}`
      : `Voluntary donation of ${amount} Stars with nothing in return. No refunds. Terms: ${TERMS_URL}`,
    payload: buildPayload(amount, user.id),
    provider_token: '',
    currency: CURRENCY,
    prices: [{ label: german ? 'Spende' : 'Donation', amount }],
  });
  return { link };
}
