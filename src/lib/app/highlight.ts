// The localised one-line highlight of a release, from the message files when it exists
// (`changelog_v<version>`), else the English summary from CHANGELOG.md.
import { m } from '#lib/paraglide/messages.js';
import { highlightKey, type ChangelogRelease } from './changelog.js';

type MessageFn = (inputs: object, options: { locale: string }) => string;

export function releaseHighlight(release: ChangelogRelease, locale: string): string {
  const message = (m as unknown as Record<string, MessageFn | undefined>)[highlightKey(release.version)];
  return message ? message({}, { locale }) : release.summary;
}
