<script lang="ts">
  import StoryMode from '#lib/story/StoryMode.svelte';
  import StorySettings from '#lib/story/StorySettings.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<StorySettings />{/snippet}
</GameToolbar>
<StoryMode />
