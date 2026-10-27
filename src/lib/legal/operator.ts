// Operator details shown on the legal pages and referenced by the ptb-words Telegram bot.
// Everything in [brackets] is a placeholder: § 5 DDG requires a real name and a postal address
// where the operator can be served, so the Impressum stays incomplete until these are filled in.
export const operator = {
	name: '[Vor- und Nachname]',
	street: '[Straße und Hausnummer]',
	city: '[PLZ Ort]',
	country: 'Deutschland',
	email: '[kontakt@beispiel.de]',
	// A second direct and fast contact channel next to e-mail, as the CJEU requires for § 5 DDG.
	telegram: 'https://t.me/word_circle_bot',
	updated: '27. Oktober 2026'
};

export const isPlaceholder = (value: string) => value.startsWith('[');
