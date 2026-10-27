<script lang="ts">
  import LegalPage from '#lib/legal/LegalPage.svelte';
  import { operator } from '#lib/legal/operator.js';
</script>

<LegalPage title="Impressum" kicker="Anbieterkennzeichnung">
  <h2>Angaben gemäß § 5 DDG</h2>
  <address>
    {operator.name}<br />
    {operator.street}<br />
    {operator.city}<br />
    {operator.country}
  </address>

  <h2>Kontakt</h2>
  <p>E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a><br />Telegram: <a href={operator.telegram} rel="noopener">{operator.telegram.replace('https://', '')}</a></p>

  <h2>Verantwortlich für den Inhalt</h2>
  <p>{operator.name}, Anschrift wie oben.</p>

  <h2>Verbraucherstreitbeilegung</h2>
  <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).</p>

  <h2>Haftung für Links</h2>
  <p>WordCircle verweist auf Seiten Dritter, etwa Wiktionary oder Telegram. Für deren Inhalte sind allein die jeweiligen Anbieter verantwortlich. Rechtswidrige Inhalte waren beim Setzen der Links nicht erkennbar; werden uns Rechtsverletzungen bekannt, entfernen wir den Link umgehend.</p>
</LegalPage>
