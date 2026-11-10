<!-- Settings for the story and listening modes, shown in their settings sheet (app/GameToolbar.svelte). -->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import GameSetting from '#lib/app/GameSetting.svelte';

  const locale = $derived({ locale: settings.interfaceLocale });
</script>

<GameSetting label={m.dialects({}, locale)} hint={m.dialects_hint({}, locale)}>
  <input aria-label={m.dialects({}, locale)} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.dialects} onchange={(event) => settings.setDialects((event.currentTarget as HTMLInputElement).checked)} />
</GameSetting>
