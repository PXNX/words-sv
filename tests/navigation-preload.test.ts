import { describe, expect, it, vi } from 'vitest';
import { preloadBudget, preloadDestinations, selectPreloadTargets } from '../src/lib/app/preload';

describe('preload budget', () => {
  it('fetches nothing when the learner asked to save data', () => {
    expect(preloadBudget({ saveData: true, effectiveType: '4g' })).toBe(0);
  });

  it('scales with the connection', () => {
    expect(preloadBudget({ effectiveType: 'slow-2g' })).toBe(1);
    expect(preloadBudget({ effectiveType: '2g' })).toBe(3);
    expect(preloadBudget({ effectiveType: '3g' })).toBe(6);
    expect(preloadBudget({ effectiveType: '4g' })).toBe(10);
  });

  it('assumes mobile data where the browser reports nothing', () => {
    expect(preloadBudget(undefined)).toBe(4);
    expect(preloadBudget({})).toBe(4);
  });

  it('stays bounded for connections that report something unexpected', () => {
    expect(preloadBudget({ effectiveType: '5g' })).toBe(4);
  });
});

describe('preload targets', () => {
  const links = ['/vocab', '/repeat', '/dictionary', '/progress', '/settings', '/stories'];

  it('takes the links in reading order up to the budget', () => {
    expect(selectPreloadTargets(links, '/', 3)).toEqual(['/vocab', '/repeat', '/dictionary']);
  });

  it('leaves out the current page and repeats of the same route', () => {
    const hrefs = ['/vocab?repair=1', '/repeat', '/vocab', '/repeat/?tab=due', '/dictionary'];
    expect(selectPreloadTargets(hrefs, '/repeat', 10)).toEqual(['/vocab?repair=1', '/dictionary']);
  });

  it('keeps the query string of the first link that was picked', () => {
    expect(selectPreloadTargets(['/vocab?repair=1', '/vocab'], '/', 5)).toEqual(['/vocab?repair=1']);
  });

  it('ignores links that are not a navigation to an app page', () => {
    const hrefs = ['https://example.com/', '//example.com/', '#top', '/api/proxy?path=x', '/impressum'];
    expect(selectPreloadTargets(hrefs, '/', 10)).toEqual(['/impressum']);
  });

  it('treats a trailing slash as the same page', () => {
    expect(selectPreloadTargets(['/progress/'], '/progress', 5)).toEqual([]);
    expect(selectPreloadTargets(['/progress'], '/progress/', 5)).toEqual([]);
  });

  it('fetches nothing with a budget of zero', () => {
    expect(selectPreloadTargets(links, '/', 0)).toEqual([]);
  });
});

describe('preloading destinations', () => {
  it('fetches one after another and reports what arrived', async () => {
    const load = vi.fn(async (href: string) => href);
    const loaded = await preloadDestinations(['/vocab', '/repeat'], { load });
    expect(load.mock.calls).toEqual([['/vocab'], ['/repeat']]);
    expect(loaded).toEqual(['/vocab', '/repeat']);
  });

  it('waits for the main thread before each destination', async () => {
    const order: string[] = [];
    const load = vi.fn(async (href: string) => { order.push(href); });
    await preloadDestinations(['/vocab', '/repeat'], {
      load,
      idle: async () => { order.push('idle'); }
    });
    expect(order).toEqual(['idle', '/vocab', 'idle', '/repeat']);
  });

  it('stops spending the connection after a failure', async () => {
    const load = vi.fn(async (href: string) => {
      if (href === '/repeat') throw new Error('offline');
      return href;
    });
    const loaded = await preloadDestinations(['/vocab', '/repeat', '/dictionary'], { load });
    expect(load).toHaveBeenCalledTimes(2);
    expect(loaded).toEqual(['/vocab']);
  });

  it('stops as soon as the page is left', async () => {
    let cancelled = false;
    const load = vi.fn(async () => { cancelled = true; });
    const loaded = await preloadDestinations(['/vocab', '/repeat'], { load, isCancelled: () => cancelled });
    expect(load).toHaveBeenCalledTimes(1);
    expect(loaded).toEqual(['/vocab']);
  });
});
