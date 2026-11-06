// Same rules as bot/donations.py: the Python bot validates the pre-checkout query against them.
export const CURRENCY = 'XTR';
export const TIERS = [25, 50, 100, 250, 500];
export const TERMS_URL = 'https://words-sv.vercel.app/bedingungen';

export function buildPayload(amount, userId) {
  return `donation:${amount}:${userId}`;
}
