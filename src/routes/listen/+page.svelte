<script lang="ts">
  import ListenMode from '#lib/story/ListenMode.svelte';
  import StorySettings from '#lib/story/StorySettings.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import AiModeSettings from '#lib/app/AiModeSettings.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<StorySettings /><AiModeSettings voice />{/snippet}
</GameToolbar>
<ListenMode />
