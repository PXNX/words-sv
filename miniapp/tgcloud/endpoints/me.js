import { EndpointError } from 'sdk';
import { TIERS } from '../lib/donations.js';

// POST /api/me — who is calling, taken from init data the platform has already verified.
// This is the Mini App's whole login: no password, no session, no cookie.
export default async function (input, ctx) {
  const user = ctx.initData.user;
  if (!user) throw new EndpointError('No Telegram user in init data', { code: 'NO_USER' });
  return { id: user.id, firstName: user.first_name, languageCode: user.language_code ?? 'en', tiers: TIERS };
}
