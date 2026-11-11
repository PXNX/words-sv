<script lang="ts">
  import DictionaryPage from '#lib/dictionary/DictionaryPage.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import AiModeSettings from '#lib/app/AiModeSettings.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<AiModeSettings voice />{/snippet}
</GameToolbar>

<DictionaryPage />
