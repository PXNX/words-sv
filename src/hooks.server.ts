import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { getTextDirection, locales } from '#lib/paraglide/runtime.js';
import { loadLocaleMessages } from '#lib/i18n/messages.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';

const handleParaglide: Handle = ({ event, resolve }) => paraglideMiddleware(event.request, ({ locale }) => {
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale))
	});
});

export const handle: Handle = handleParaglide;

// Prerendering has every locale at hand; only the browser loads them one at a time.
export const init: ServerInit = async () => {
	await Promise.all(locales.map((locale) => loadLocaleMessages(locale)));
};
