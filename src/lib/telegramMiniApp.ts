// WordCircle opened as @word_circle_bot's Mini App: Telegram passes the signed launch data in the URL
// hash (`#tgWebAppData=…`). It is read once at start, kept for the session (the router replaces the
// hash on the first navigation) and needs no Telegram script.
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
