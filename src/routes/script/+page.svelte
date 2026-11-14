<script lang="ts">
  import ScriptMode from '#lib/script/ScriptMode.svelte';
  import { settings } from '#lib/state/settings.svelte.js';
</script>

<ScriptMode language={settings.lang} />
