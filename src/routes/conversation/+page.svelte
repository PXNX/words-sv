<script lang="ts">
  import ConversationMode from '#lib/conversation/ConversationMode.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import AiModeSettings from '#lib/app/AiModeSettings.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<AiModeSettings voice llm="conversation" />{/snippet}
</GameToolbar>

<ConversationMode />
