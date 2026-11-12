<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { changelogSheet } from '#lib/app/changelogSheet.svelte.js';

  // The version history is a sheet in the settings now (app/ChangelogSheet.svelte). Links to this
  // old page – the Telegram bot's version command among them – still work: they open the sheet and
  // land on the settings, where it belongs.
  onMount(() => {
    changelogSheet.open = true;
    void goto('/settings', { replaceState: true });
  });
</script>
