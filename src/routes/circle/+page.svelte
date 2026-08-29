<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import CircleGame from '$lib/circle/CircleGame.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { consumeCirclePracticeRequest } from '$lib/circle/practice';

  const CIRCLE_TUTORIAL_STATE_KEY = 'wordcircle-tutorial-state-v1';

  const practiceLanguage = browser ? consumeCirclePracticeRequest() : null;
  const needsTutorial = browser && !practiceLanguage && (settings.lang === 'de' || settings.lang === 'en') && localStorage.getItem(CIRCLE_TUTORIAL_STATE_KEY) !== 'complete';
  if (needsTutorial) void goto('/circle/tutorial', { replaceState: true });
</script>

<CircleGame {practiceLanguage} />
