// The app's message functions. `#lib/paraglide/messages.js` resolves to this file (see the alias in
// vite.config.ts), so `import { m } from '#lib/paraglide/messages.js'` keeps its generated types
// while each locale's messages travel as their own chunk: the first load fetches only the locale
// in use (plus the German base where a translation is incomplete), a switch fetches the next one.
// The service worker precaches every locale chunk with the rest of the build, so switching also
// works offline.
import { getLocale, type Locale } from '../paraglide/runtime.js';
import { createLazyMessages, type Catalog } from './lazyMessages.js';

const modules = import.meta.glob<Catalog>(['../paraglide/messages/*.js', '!../paraglide/messages/_index.js']);
const loaders: Partial<Record<Locale, () => Promise<Catalog>>> = {};
for (const [path, loader] of Object.entries(modules)) loaders[path.slice(path.lastIndexOf('/') + 1, -'.js'.length) as Locale] = loader;

const messages = createLazyMessages<Locale>({ loaders, currentLocale: getLocale });

export const m = messages.m as unknown as typeof import('../paraglide/messages/_index.js');

/** Resolves once the locale's messages are there; a locale must be loaded before it is shown. */
export const loadLocaleMessages = (locale: Locale): Promise<void> => messages.load(locale);
export const hasLocaleMessages = (locale: Locale): boolean => messages.isLoaded(locale);
