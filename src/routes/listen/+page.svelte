<script lang="ts">
  import ListenMode from '#lib/story/ListenMode.svelte';
  import StorySettings from '#lib/story/StorySettings.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<StorySettings />{/snippet}
</GameToolbar>
<ListenMode />
