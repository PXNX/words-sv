// Bundle and pack budgets, checked after `bun run build` (CI runs it too). Reads Vite's client
// manifest and measures gzipped sizes:
//   - shell: the app entry plus the root layout and everything they import statically;
//   - routes: each page with its static imports (the shell counted in, as on a first visit);
//   - packs: each per-level word file (src/lib/data/<lang>.<level>.json), loaded on demand.
// Workers and the on-device model runtimes are left out: they load only when a model is used.
// Usage: bun scripts/bundle-budget.ts [--json]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Set a little above the sizes measured when they were introduced, so growth is a decision, not an accident.
export const BUDGETS_KB = { shell: 330, route: 560, pack: 60 } as const;

type Chunk = { file: string; src?: string; name?: string; isEntry?: boolean; isDynamicEntry?: boolean; imports?: string[]; css?: string[] };
type Manifest = Record<string, Chunk>;

const root = join(import.meta.dirname, '..');
const client = join(root, '.svelte-kit/output/client');
const manifest = JSON.parse(readFileSync(join(client, '.vite/manifest.json'), 'utf8')) as Manifest;

const sizes = new Map<string, number>();
function gzipped(file: string): number {
  let size = sizes.get(file);
  if (size === undefined) {
    size = gzipSync(readFileSync(join(client, file)), { level: 9 }).length;
    sizes.set(file, size);
  }
  return size;
}

/** The files a chunk needs before it runs: itself, its static imports and their CSS. */
function closure(key: string, seen = new Set<string>()): Set<string> {
  const chunk = manifest[key];
  if (!chunk || seen.has(chunk.file)) return seen;
  seen.add(chunk.file);
  for (const css of chunk.css ?? []) seen.add(css);
  for (const imported of chunk.imports ?? []) closure(imported, seen);
  return seen;
}
const total = (files: Iterable<string>) => [...files].reduce((sum, file) => sum + gzipped(file), 0);
const kb = (bytes: number) => Math.round(bytes / 102.4) / 10;

const nodeKey = (index: number) => Object.keys(manifest).find((key) => key.endsWith(`/nodes/${index}.js`) && manifest[key]!.isEntry);
const appKey = Object.keys(manifest).find((key) => key.endsWith('/app.js') && manifest[key]!.isEntry);
const layoutKey = nodeKey(0);
if (!appKey || !layoutKey) throw new Error('No app entry or root layout in the manifest; run `bun run build` first.');

const shellFiles = closure(layoutKey, closure(appKey));
const shell = total(shellFiles);
const routes = Object.keys(manifest)
  .filter((key) => /\/nodes\/\d+\.js$/u.test(key) && key !== layoutKey && manifest[key]!.isEntry)
  .map((key) => ({ node: key.slice(key.lastIndexOf('/') + 1), size: total(closure(key, new Set(shellFiles))) }))
  .sort((a, b) => b.size - a.size);
const packs = Object.entries(manifest)
  .filter(([key]) => /^src\/lib\/data\/[a-z]{2}\.[a-c][12]\.json$/u.test(key))
  .map(([key, chunk]) => ({ pack: key.slice('src/lib/data/'.length, -'.json'.length), size: gzipped(chunk.file) }))
  .sort((a, b) => b.size - a.size);

const over = [
  ...(kb(shell) > BUDGETS_KB.shell ? [`shell ${kb(shell)} KB > ${BUDGETS_KB.shell} KB`] : []),
  ...routes.filter((route) => kb(route.size) > BUDGETS_KB.route).map((route) => `route ${route.node} ${kb(route.size)} KB > ${BUDGETS_KB.route} KB`),
  ...packs.filter((pack) => kb(pack.size) > BUDGETS_KB.pack).map((pack) => `pack ${pack.pack} ${kb(pack.size)} KB > ${BUDGETS_KB.pack} KB`)
];

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ shell, routes, packs, budgetsKb: BUDGETS_KB, over }, null, 2));
} else {
  console.log(`shell (entry + layout): ${kb(shell)} KB gzip (budget ${BUDGETS_KB.shell})`);
  console.log(`largest routes: ${routes.slice(0, 5).map((route) => `${route.node} ${kb(route.size)}`).join(', ')} KB (budget ${BUDGETS_KB.route})`);
  console.log(`packs: ${packs.length}, total ${kb(packs.reduce((sum, pack) => sum + pack.size, 0))} KB; largest ${packs.slice(0, 5).map((pack) => `${pack.pack} ${kb(pack.size)}`).join(', ')} KB (budget ${BUDGETS_KB.pack})`);
}
if (over.length) {
  console.error(`Over budget:\n  ${over.join('\n  ')}`);
  process.exit(1);
}
