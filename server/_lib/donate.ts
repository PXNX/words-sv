// Voluntary donations in Telegram Stars from the app: any amount from DONATE_MIN to DONATE_MAX. The
// payload is the bot's `donation:<amount>:<user>` (bot/bot/donations.py), with user 0 when the device
// is not signed in, so anyone who opens the link may pay it. The bot checks and records the payment.
export const DONATE_MIN = 500;
export const DONATE_MAX = 10_000;

export function validDonation(amount: unknown): amount is number {
	return typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= DONATE_MIN && amount <= DONATE_MAX;
}

export function donationPayload(amount: number, userId: number | null): string {
	return `donation:${amount}:${userId ?? 0}`;
}
