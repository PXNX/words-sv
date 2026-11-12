<!--
  Credits: whose work WordCircle stands on. Typefaces, icons, the pictures beside words, the
  speech and language models (read from their registries, so the list cannot go stale) and the
  libraries the app is built with.
-->
<script lang="ts">
  import LegalPage from '#lib/legal/LegalPage.svelte';
  import { voiceEngineIds, voiceEngines } from '#lib/voice/engines.js';
  import { chatModels } from '#lib/conversation/models.js';

  const voices = voiceEngineIds.map((id) => voiceEngines[id]).filter((engine) => engine.model || engine.licence);
</script>

<LegalPage title="Quellen und Dank" kicker="Worauf WordCircle aufbaut">
  <p>WordCircle läuft auf deinem Gerät und nutzt dafür die Arbeit vieler anderer. Hier steht, was von wem stammt und unter welcher Lizenz.</p>

  <h2>Schriften</h2>
  <ul>
    <li><strong>DM Sans</strong> und <strong>DM Serif Display</strong> von Colophon Foundry, SIL Open Font License 1.1.</li>
  </ul>

  <h2>Symbole und Bilder</h2>
  <ul>
    <li><strong>Material Symbols</strong> von Google, Apache-Lizenz 2.0.</li>
    <li><strong>Font Awesome Free</strong> (Markenzeichen), CC BY 4.0.</li>
    <li>Die Bilder neben den Wörtern sind die Emoji deines Geräts; sie werden nicht mit der App ausgeliefert.</li>
    <li>Mia, Tom, Lilith und die übrigen Figuren und Szenen sind für WordCircle gezeichnet.</li>
  </ul>

  <h2>Stimmen</h2>
  <ul>
    <li>Die Standardstimme ist die Sprachausgabe deines Browsers oder Betriebssystems.</li>
    {#each voices as engine (engine.id)}
      <li><strong>{engine.name}</strong>{#if engine.model}: <code>{engine.model}</code>{/if}{#if engine.licence}, Lizenz: {engine.licence}{/if}.</li>
    {/each}
  </ul>

  <h2>Sprachmodelle</h2>
  <p>Für Gespräche und die Bewertung von Texten lädt die App auf Wunsch eines dieser Modelle auf dein Gerät. Sie gehören ihren Herstellern und stehen unter deren Lizenzen:</p>
  <ul>
    {#each chatModels as model (model.id)}
      <li><strong>{model.label}</strong> (<code>{model.webllm}</code>)</li>
    {/each}
  </ul>

  <h2>Software</h2>
  <ul>
    <li><strong>Svelte</strong> und <strong>SvelteKit</strong>, MIT-Lizenz.</li>
    <li><strong>Tailwind CSS</strong> und <strong>daisyUI</strong>, MIT-Lizenz.</li>
    <li><strong>Paraglide JS</strong> (inlang) für die Übersetzungen, MIT-Lizenz.</li>
    <li><strong>WebLLM</strong> (MLC), Apache-Lizenz 2.0.</li>
    <li><strong>Transformers.js</strong> (Hugging Face), Apache-Lizenz 2.0, und <strong>ONNX Runtime Web</strong>, MIT-Lizenz.</li>
    <li><strong>Piper</strong> (rhasspy/piper) für die natürlichen Stimmen, MIT-Lizenz; die einzelnen Stimmen haben eigene Lizenzen. Die Lautschrift dafür erzeugt <strong>eSpeak NG</strong>, GPL-3.0.</li>
    <li><strong>phonemizer</strong>, Apache-Lizenz 2.0.</li>
    <li><strong>Valibot</strong>, MIT-Lizenz.</li>
  </ul>

  <h2>Wörter und Texte</h2>
  <p>Die Wortlisten, Definitionen, Geschichten, Lesetexte und Grammatiksätze sind für WordCircle geschrieben und geprüft. Die Einstufung der Wörter orientiert sich an den Niveaus des Gemeinsamen Europäischen Referenzrahmens; für Französisch wurde sie mit FLELex abgeglichen.</p>
</LegalPage>
