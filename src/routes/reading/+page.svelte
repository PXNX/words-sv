<script lang="ts">
  import ReadingMode from '#lib/story/ReadingMode.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import AiModeSettings from '#lib/app/AiModeSettings.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<AiModeSettings voice />{/snippet}
</GameToolbar>

<ReadingMode />
