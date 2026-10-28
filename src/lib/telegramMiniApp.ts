// WordCircle opened as @word_circle_bot's Mini App: Telegram passes the signed launch data in the URL
// hash (`#tgWebAppData=…`). It is read once at start and kept for the session (the router replaces the
// hash on the first navigation). Telegram's script is only loaded for the screen insets, see
// loadTelegramWebApp.
export type MiniAppUser = { id: number; first_name: string; language_code?: string };
export type MiniAppLaunch = { initData: string; user: MiniAppUser };

const SESSION_KEY = 'wordcircle-telegram-init-data-v1';
let launch: MiniAppLaunch | null | undefined;

function parse(initData: string | null): MiniAppLaunch | null {
	if (!initData) return null;
	try {
		const user = JSON.parse(new URLSearchParams(initData).get('user') ?? '') as MiniAppUser;
		return Number.isSafeInteger(user?.id) ? { initData, user } : null;
	} catch {
		return null;
	}
}

export function miniAppLaunch(): MiniAppLaunch | null {
	if (launch !== undefined) return launch;
	if (typeof location === 'undefined') return null;
	const fromHash = new URLSearchParams(location.hash.slice(1)).get('tgWebAppData');
	try {
		if (fromHash) sessionStorage.setItem(SESSION_KEY, fromHash);
		launch = parse(fromHash ?? sessionStorage.getItem(SESSION_KEY));
	} catch {
		launch = parse(fromHash);
	}
	return launch;
}

// In fullscreen, Telegram draws the status bar and its own close and menu buttons over the page.
// Its script keeps --tg-safe-area-inset-* (status bar) and --tg-content-safe-area-inset-* (Telegram's
// buttons) up to date on <html>; the layout moves the page below them. Outside Telegram nothing is
// loaded and the variables stay unset.
export function loadTelegramWebApp() {
	if (typeof document === 'undefined' || document.getElementById('telegram-web-app')) return;
	const script = document.createElement('script');
	script.id = 'telegram-web-app';
	script.src = 'https://telegram.org/js/telegram-web-app.js';
	script.async = true;
	script.addEventListener('load', () => (window as { Telegram?: { WebApp?: { ready(): void } } }).Telegram?.WebApp?.ready());
	document.head.append(script);
}
