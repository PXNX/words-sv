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

export async function takeOverUpdate() {
	const registration = await getRegistration();
	if (registration) {
		await registration.update().catch(() => undefined);
		await waitForInstalled(registration);
		await activateWaiting(registration);
	}
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
