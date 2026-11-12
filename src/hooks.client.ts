/**
 * The service worker (src/service-worker.ts) is registered by SvelteKit as /service-worker.js.
 * Older builds registered /sw.js; static/sw.js now retires those registrations on its own.
 */
import type { ClientInit } from '@sveltejs/kit/hooks';
import { baseLocale } from '#lib/paraglide/runtime.js';
import { loadLocaleMessages } from '#lib/i18n/messages.js';
import { settings } from '#lib/state/settings.svelte.js';

// The app starts once the messages of the learner's interface language are there; the other
// languages are fetched when the learner switches to them.
export const init: ClientInit = async () => {
	try {
		await loadLocaleMessages(settings.interfaceLocale);
	} catch {
		await loadLocaleMessages(baseLocale).catch(() => undefined);
	}
};
