import { preloadData } from '$app/navigation';
import { preloadBudget, preloadDestinations, selectPreloadTargets, type ConnectionInfo } from './preload.js';

function connection(): ConnectionInfo | undefined {
  return (navigator as Navigator & { connection?: ConnectionInfo }).connection;
}

/** requestIdleCallback, with a timeout so a busy page still gets to it, and a fallback for Safari. */
function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 600 });
    else setTimeout(resolve, 50);
  });
}

/** Every link on the page in reading order (the dock renders after the page's own links). */
function pageLinks(): string[] {
  return [...document.querySelectorAll('main a[href]')].map((link) => link.getAttribute('href') ?? '');
}

/**
 * Fetches the destinations of the page that just opened while nothing else is going on, so the
 * learner's next tap only has to render (see lib/app/preload.ts for how much is fetched).
 *
 * Returns the function that stops the warm-up, which the app shell calls when it leaves the page.
 */
export function preloadDestinationsOfPage(currentPath: string): () => void {
  let cancelled = false;
  const cancel = () => { cancelled = true; };
  if (typeof document === 'undefined' || !navigator.onLine || document.visibilityState !== 'visible') return cancel;
  const budget = preloadBudget(connection());
  if (budget === 0) return cancel;
  void (async () => {
    await whenIdle();
    if (cancelled) return;
    const targets = selectPreloadTargets(pageLinks(), currentPath, budget);
    if (targets.length === 0) return;
    await preloadDestinations(targets, {
      load: (href) => preloadData(href),
      idle: whenIdle,
      isCancelled: () => cancelled || !navigator.onLine
    });
  })();
  return cancel;
}
