// Interface messages loaded one locale at a time. The compiler writes one module per locale
// (every message of that locale, missing ones re-exported from the base locale); this keeps the
// ones that have arrived and answers `m.some_key(inputs, { locale })` from them, so the call sites
// stay as they are while the first load carries a single locale instead of all of them.

export type MessageFunction = (inputs?: Record<string, unknown>) => string;
export type Catalog = Readonly<Record<string, unknown>>;
type MessageOptions = { locale?: string };
type LazyMessage = (inputs?: Record<string, unknown>, options?: MessageOptions) => string;

export type LazyMessages<Locale extends string> = {
  /** Message functions by key; each one answers from the catalog of the asked (or current) locale. */
  m: Record<string, LazyMessage>;
  /** Fetches a locale's catalog; resolves once its messages can be rendered. Safe to call again. */
  load(locale: Locale): Promise<void>;
  isLoaded(locale: Locale): boolean;
};

export function createLazyMessages<Locale extends string>(options: {
  /** One loader per locale, each resolving to that locale's message module. */
  loaders: Readonly<Partial<Record<Locale, () => Promise<Catalog>>>>;
  /** The locale used when a call names none. */
  currentLocale: () => Locale;
}): LazyMessages<Locale> {
  const loaded = new Map<string, Catalog>();
  const pending = new Map<string, Promise<void>>();
  // What is shown while an asked locale has not arrived: the locale loaded last.
  let latest: Catalog | undefined;

  function load(locale: Locale): Promise<void> {
    if (loaded.has(locale)) return Promise.resolve();
    const running = pending.get(locale);
    if (running) return running;
    const loader = options.loaders[locale];
    if (!loader) return Promise.reject(new Error(`No messages for locale "${locale}"`));
    const request = loader().then(
      (catalog) => {
        loaded.set(locale, catalog);
        latest = catalog;
        pending.delete(locale);
      },
      (error: unknown) => {
        // A failed download (offline, a build that has gone) can be tried again.
        pending.delete(locale);
        throw error;
      }
    );
    pending.set(locale, request);
    return request;
  }

  const functions = new Map<string, LazyMessage>();
  const m = new Proxy({} as Record<string, LazyMessage>, {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      let message = functions.get(key);
      if (!message) {
        message = (inputs = {}, call = {}) => {
          const catalog = (call.locale ? loaded.get(call.locale) : undefined) ?? loaded.get(options.currentLocale()) ?? latest;
          const render = catalog?.[key];
          return typeof render === 'function' ? (render as MessageFunction)(inputs) : '';
        };
        functions.set(key, message);
      }
      return message;
    }
  });

  return { m, load, isLoaded: (locale) => loaded.has(locale) };
}
