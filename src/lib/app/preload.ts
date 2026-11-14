/*
 * Warming the destinations a learner is about to tap.
 *
 * Navigation in the app is client-side, so a tap waits only for the target route's own code chunk
 * (and the `load` data that goes with it) before it can render. On a slow connection that wait is
 * seconds long, while the learner is usually still deciding for at least as long. Fetching the
 * likely destinations in the background in that time is what makes the tap itself instant.
 *
 * How much is fetched depends on the connection: Save-Data means nothing at all, a slow link gets
 * only the most likely destination, and only a fast link gets the whole page's links.
 */

export type ConnectionInfo = {
  saveData?: boolean;
  effectiveType?: string;
};

const BUDGET_BY_TYPE: Record<string, number> = { 'slow-2g': 1, '2g': 3, '3g': 6, '4g': 10 };
const UNKNOWN_BUDGET = 4;
const MAX_BUDGET = 10;

/** How many destinations are worth fetching ahead of a tap on this connection. */
export function preloadBudget(connection: ConnectionInfo | undefined): number {
  if (connection?.saveData === true) return 0;
  const budget = BUDGET_BY_TYPE[connection?.effectiveType ?? ''] ?? UNKNOWN_BUDGET;
  return Math.min(budget, MAX_BUDGET);
}

/** Destinations are the page itself (no trailing slash, no query) to compare apples to apples. */
const pageKey = (path: string) => path.replace(/[?#].*$/u, '').replace(/\/+$/u, '') || '/';

/**
 * Picks the destinations to fetch from a page's links, in the order they appear: the learner's
 * likely next step is nearer the top of the page. The current page and repeats of an already picked
 * route are dropped, so the budget buys distinct pages.
 */
export function selectPreloadTargets(hrefs: readonly string[], currentPath: string, budget: number): string[] {
  if (budget <= 0) return [];
  const seen = new Set([pageKey(currentPath)]);
  const targets: string[] = [];
  for (const href of hrefs) {
    if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) continue;
    const key = pageKey(href);
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(href);
    if (targets.length >= budget) break;
  }
  return targets;
}

export type PreloadOptions = {
  /** Fetches one destination (the app passes `preloadData` from `$app/navigation`). */
  load: (href: string) => Promise<unknown>;
  /** Resolves once the main thread is free again, so parsing a chunk never delays a tap. */
  idle?: () => Promise<void>;
  isCancelled?: () => boolean;
};

/**
 * Fetches the destinations one after another, never in parallel: a tap that comes in meanwhile
 * then waits only for its own route, not behind a queue of downloads. Stops at the first failure
 * (offline, a broken link) instead of spending the rest of the connection on it.
 */
export async function preloadDestinations(targets: readonly string[], options: PreloadOptions): Promise<string[]> {
  const { load, idle = async () => {}, isCancelled = () => false } = options;
  const loaded: string[] = [];
  for (const target of targets) {
    if (isCancelled()) break;
    try {
      await idle();
      if (isCancelled()) break;
      await load(target);
    } catch {
      break;
    }
    loaded.push(target);
  }
  return loaded;
}
