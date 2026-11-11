// Persian and Arabic run the interface right to left (`dir` on <html>), so spacing, borders and text
// alignment use logical properties (start/end) instead of left/right. Decorative absolute positions
// (left: 50% for centring, confetti) are left alone, and so are centred shapes on such lines; see docs/rtl.md.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', 'src');
const PHYSICAL = [
  /text-align:\s*(?:left|right)/u,
  /(?:margin|padding|border)-(?:left|right)\b/u,
  /class="[^"]*\b(?:ml|mr|pl|pr)-[\d[]/u
];

function svelteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'paraglide') return [];
    if (statSync(path).isDirectory()) return svelteFiles(path);
    return name.endsWith('.svelte') ? [path] : [];
  });
}

describe('right-to-left layout', () => {
  it('uses logical properties for text alignment, spacing and borders', () => {
    const offenders = svelteFiles(ROOT).flatMap((file) =>
      readFileSync(file, 'utf8').split('\n').flatMap((line, index) => (!/left:\s*50%/u.test(line) && PHYSICAL.some((pattern) => pattern.test(line)) ? [`${file.slice(ROOT.length + 1)}:${index + 1}`] : []))
    );
    expect(offenders).toEqual([]);
  });
});
