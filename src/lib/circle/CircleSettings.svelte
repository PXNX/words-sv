<!-- Circle's own settings, shown in its settings sheet (app/GameToolbar.svelte). -->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import GameSetting from '#lib/app/GameSetting.svelte';

  const locale = $derived({ locale: settings.interfaceLocale });
</script>

<GameSetting label={m.backwards({}, locale)} hint={m.backwards_explain({}, locale)}>
  <input aria-label={m.backwards({}, locale)} type="checkbox" class="toggle toggle-sm toggle-primary" checked={settings.allowBackwardWords} onchange={(event) => settings.setAllowBackwardWords((event.currentTarget as HTMLInputElement).checked)} />
</GameSetting>
