// Numbers in interface text (counters, scores, ETAs), formatted with the learner's "format like"
// setting, so Persian or Arabic-Indic digits show up wherever the learner chose them. Reactive:
// used in markup or a $derived, it follows a change of the setting.
import { settings } from '#lib/state/settings.svelte.js';
import { formatNumber } from './format.js';

export function num(value: number): string {
  return formatNumber(settings.formatContext, value);
}
