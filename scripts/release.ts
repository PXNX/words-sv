// Cuts a CalVer release: computes the next `YYYY.M.N`, moves the "Unreleased" entries of
// CHANGELOG.md under the new version, bumps package.json, commits, tags, pushes and creates
// the GitHub release with that section as notes.
//
//   bun scripts/release.ts "One-line summary" [--dry-run]
//
// Run it on a clean, pushed `main`. The highlight shown in the app goes into the message files
// as `changelog_v<version>` (with dots as underscores) before releasing.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseChangelog } from '../src/lib/app/changelog.js';
import { nextCalVer, type AppVersion } from '../src/lib/app/version.js';

/** Moves the Unreleased section under a new heading; throws when there is nothing to release. */
export function cutChangelog(markdown: string, version: AppVersion, date: string, summary: string): { changelog: string; notes: string } {
  const start = markdown.search(/^## \[?unreleased\]?.*$/imu);
  if (start < 0) throw new Error('CHANGELOG.md has no "## Unreleased" section');
  const headingEnd = markdown.indexOf('\n', start) + 1;
  const nextRelease = markdown.slice(headingEnd).search(/^## /mu);
  const end = nextRelease < 0 ? markdown.length : headingEnd + nextRelease;
  const body = markdown.slice(headingEnd, end).trim();
  if (!/^[-*] /mu.test(body)) throw new Error('Nothing to release: "Unreleased" has no entries');
  const section = `## v${version} - ${date}\n\n${summary.trim()}\n\n${body}\n`;
  const changelog = `${markdown.slice(0, start)}## Unreleased\n\n${section}\n${markdown.slice(end)}`.replace(/\n{3,}/gu, '\n\n');
  parseChangelog(changelog);
  return { changelog, notes: `${summary.trim()}\n\n${body}\n` };
}

function run(command: string, args: string[], dryRun: boolean) {
  console.log(`$ ${command} ${args.join(' ')}`);
  if (!dryRun) execFileSync(command, args, { stdio: 'inherit' });
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const summary = args.find((arg) => !arg.startsWith('--'));
  if (!summary) throw new Error('Usage: bun scripts/release.ts "One-line summary" [--dry-run]');

  if (execFileSync('git', ['status', '--porcelain', '--', 'CHANGELOG.md', 'package.json'], { encoding: 'utf8' }).trim()) {
    throw new Error('CHANGELOG.md or package.json has uncommitted changes');
  }
  execFileSync('git', ['fetch', '--tags', '--quiet']);
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const now = new Date();
  const version = nextCalVer(now, tags);
  const date = now.toISOString().slice(0, 10);
  const { changelog, notes } = cutChangelog(readFileSync('CHANGELOG.md', 'utf8'), version, date, summary);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  pkg.version = version;

  console.log(`Releasing ${version}\n\n${notes}`);
  if (!dryRun) {
    writeFileSync('CHANGELOG.md', changelog);
    writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  }
  run('git', ['add', 'CHANGELOG.md', 'package.json'], dryRun);
  run('git', ['commit', '-m', `chore(release): ${version}`], dryRun);
  run('git', ['tag', '-a', `v${version}`, '-m', `WordCircle ${version}: ${summary}`], dryRun);
  run('git', ['push', 'origin', 'HEAD', `v${version}`], dryRun);
  run('gh', ['release', 'create', `v${version}`, '--title', `WordCircle ${version}`, '--notes', notes], dryRun);
}
