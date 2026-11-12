import { describe, expect, it, vi } from 'vitest';
import { createLazyMessages, type Catalog } from '../src/lib/i18n/lazyMessages.js';

const de: Catalog = { hello: () => 'Hallo', count: (inputs: { n?: number } = {}) => `${inputs.n} Wörter` };
const en: Catalog = { hello: () => 'Hello', count: (inputs: { n?: number } = {}) => `${inputs.n} words` };

function setup(current: 'de' | 'en' = 'de') {
  const loaders = { de: vi.fn(() => Promise.resolve(de)), en: vi.fn(() => Promise.resolve(en)) };
  const state = { current };
  const messages = createLazyMessages<'de' | 'en' | 'fa'>({ loaders, currentLocale: () => state.current });
  return { loaders, state, ...messages };
}

describe('createLazyMessages', () => {
  it('answers from the catalog of the asked locale once it is loaded', async () => {
    const { m, load } = setup();
    await Promise.all([load('de'), load('en')]);
    expect(m.hello!({}, { locale: 'en' })).toBe('Hello');
    expect(m.count!({ n: 3 }, { locale: 'de' })).toBe('3 Wörter');
  });

  it('uses the current locale when a call names none', async () => {
    const { m, load, state } = setup('en');
    await Promise.all([load('de'), load('en')]);
    expect(m.hello!()).toBe('Hello');
    state.current = 'de';
    expect(m.hello!()).toBe('Hallo');
  });

  it('fetches a locale only when asked, and only once', async () => {
    const { load, loaders, isLoaded } = setup();
    await load('de');
    await Promise.all([load('de'), load('de')]);
    expect(loaders.de).toHaveBeenCalledTimes(1);
    expect(loaders.en).not.toHaveBeenCalled();
    expect(isLoaded('de')).toBe(true);
    expect(isLoaded('en')).toBe(false);
  });

  it('keeps showing a loaded locale while the asked one is still on its way', async () => {
    const { m, load } = setup();
    expect(m.hello!({}, { locale: 'en' })).toBe('');
    await load('de');
    expect(m.hello!({}, { locale: 'en' })).toBe('Hallo');
    await load('en');
    expect(m.hello!({}, { locale: 'en' })).toBe('Hello');
  });

  it('hands out the same function for a key, and an empty text for an unknown key', async () => {
    const { m, load } = setup();
    await load('de');
    expect(m.hello).toBe(m.hello);
    expect(m.missing!()).toBe('');
  });

  it('lets a failed download be tried again', async () => {
    let online = false;
    const loader = vi.fn(() => (online ? Promise.resolve(en) : Promise.reject(new Error('offline'))));
    const { load, isLoaded, m } = createLazyMessages<'en'>({ loaders: { en: loader }, currentLocale: () => 'en' });
    await expect(load('en')).rejects.toThrow('offline');
    expect(isLoaded('en')).toBe(false);
    online = true;
    await load('en');
    expect(m.hello!()).toBe('Hello');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('rejects a locale it has no messages for', async () => {
    const { load } = setup();
    await expect(load('fa')).rejects.toThrow('fa');
  });
});
