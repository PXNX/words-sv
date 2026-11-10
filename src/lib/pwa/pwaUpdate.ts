const AUTO_UPDATE_GUARD_KEY = 'wordcircle-auto-update-at';
const AUTO_UPDATE_GUARD_MS = 30_000;
const INSTALL_TIMEOUT_MS = 15_000;
const TAKEOVER_TIMEOUT_MS = 4_000;

async function getRegistration() {
	if (!('serviceWorker' in navigator)) return undefined;
	return navigator.serviceWorker.getRegistration().catch(() => undefined);
}

function waitForInstalled(registration: ServiceWorkerRegistration) {
	return new Promise<void>((resolve) => {
		const worker = registration.installing;
		if (!worker || worker.state !== 'installing') return resolve();
		let timer = 0;
		const finish = () => {
			if (worker.state === 'installing') return;
			window.clearTimeout(timer);
			worker.removeEventListener('statechange', finish);
			resolve();
		};
		worker.addEventListener('statechange', finish);
		timer = window.setTimeout(() => {
			worker.removeEventListener('statechange', finish);
			resolve();
		}, INSTALL_TIMEOUT_MS);
	});
}

function activateWaiting(registration: ServiceWorkerRegistration) {
	const waiting = registration.waiting;
	if (!waiting) return Promise.resolve(false);
	return new Promise<boolean>((resolve) => {
		let settled = false;
		let timer = 0;
		const finish = () => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timer);
			navigator.serviceWorker.removeEventListener('controllerchange', finish);
			resolve(true);
		};
		navigator.serviceWorker.addEventListener('controllerchange', finish);
		waiting.postMessage({ type: 'SKIP_WAITING' });
		timer = window.setTimeout(finish, TAKEOVER_TIMEOUT_MS);
	});
}

export type UpdateOptions = {
	/** 0..1 while the new version's files are cached (reported by the service worker's install). */
	onProgress?: (share: number) => void;
	/** Reload no earlier than this, so a quick update still shows its animation. */
	minDurationMs?: number;
};

/** The new version's install progress from the service worker, or null for other messages. */
export function installShare(data: unknown): number | null {
	if (!data || typeof data !== 'object' || (data as { type?: unknown }).type !== 'INSTALL_PROGRESS') return null;
	const { done, total } = data as { done?: unknown; total?: unknown };
	return typeof done === 'number' && typeof total === 'number' && total > 0 ? Math.min(1, Math.max(0, done / total)) : null;
}

export async function takeOverUpdate({ onProgress, minDurationMs = 0 }: UpdateOptions = {}) {
	const started = Date.now();
	const listen = (event: MessageEvent) => {
		const share = installShare(event.data);
		if (share !== null) onProgress?.(share);
	};
	if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', listen);
	try {
		const registration = await getRegistration();
		if (registration) {
			await registration.update().catch(() => undefined);
			await waitForInstalled(registration);
			// Installed (or nothing to install): the download part is done.
			onProgress?.(1);
			await activateWaiting(registration);
		} else onProgress?.(1);
	} finally {
		if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', listen);
	}
	const wait = minDurationMs - (Date.now() - started);
	if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
	location.reload();
}

export async function autoUpdateOnStart() {
	if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
	const lastAttempt = Number(window.sessionStorage.getItem(AUTO_UPDATE_GUARD_KEY) ?? 0);
	if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < AUTO_UPDATE_GUARD_MS) return;
	const registration = await getRegistration();
	if (!registration) return;
	await registration.update().catch(() => undefined);
	await waitForInstalled(registration);
	if (!registration.waiting) return;
	window.sessionStorage.setItem(AUTO_UPDATE_GUARD_KEY, String(Date.now()));
	await activateWaiting(registration);
	location.reload();
}
