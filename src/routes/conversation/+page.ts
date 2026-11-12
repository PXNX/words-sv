import type { PageLoad } from './$types';
import { settings } from '#lib/state/settings.svelte.js';
import { ensureStoryPacks } from '#lib/story/storyPacks.svelte.js';

// The stories come one level at a time; the page opens once the learner's level is there.
export const load: PageLoad = async () => {
  await ensureStoryPacks(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary);
};
