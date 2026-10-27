<script lang="ts">
  import LegalPage from '#lib/legal/LegalPage.svelte';
  import { operator } from '#lib/legal/operator.js';
</script>

<LegalPage title="Nutzungs- und Spendenbedingungen" kicker="Bedingungen">
  <h2>1. Geltungsbereich</h2>
  <p>Diese Bedingungen gelten für die Web-App WordCircle (words-sv.vercel.app), den Telegram-Bot @word_circle_bot und dessen Mini-App. Anbieter ist {operator.name} (siehe <a href="/impressum">Impressum</a>).</p>

  <h2>2. Nutzung</h2>
  <p>WordCircle ist kostenlos und ohne Konto nutzbar. Es gibt keine kostenpflichtigen Funktionen und keine Abonnements. Wir bemühen uns um einen stabilen Betrieb, schulden aber keine bestimmte Verfügbarkeit und dürfen Funktionen ändern oder einstellen. Dein Fortschritt liegt in deinem Browser; wenn du dessen Daten löschst, geht er verloren.</p>

  <h2>3. Freiwillige Spenden</h2>
  <ul>
    <li>Über den Telegram-Bot kannst du die Entwicklung mit Telegram Stars unterstützen. Eine Spende ist freiwillig und eine Schenkung (§ 516 BGB). Du erhältst dafür keine Gegenleistung: keine Funktionen, keine Inhalte, keinen Vorteil in der App.</li>
    <li>Stars kaufst du bei Telegram bzw. im App-Store deines Geräts. Für diesen Kauf gelten ausschließlich deren Bedingungen und Preise.</li>
    <li>Mit dem Absenden ist die Spende abgeschlossen.</li>
  </ul>

  <h2>4. Keine Rückerstattung</h2>
  <p><strong>Spenden werden nicht erstattet.</strong> Da eine Spende eine unentgeltliche Zuwendung ist und kein Kauf einer Ware oder Dienstleistung, besteht kein gesetzliches Widerrufsrecht für Fernabsatzverträge (§§ 312 Abs. 1, 312g BGB gelten nur für Verträge über eine entgeltliche Leistung des Unternehmers). Zwingende gesetzliche Rechte bleiben unberührt, etwa bei einer doppelten oder versehentlich ausgelösten Zahlung aufgrund eines technischen Fehlers. Melde dich in diesem Fall über den Befehl /paysupport im Bot oder per E-Mail an <a href={`mailto:${operator.email}`}>{operator.email}</a>.</p>

  <h2>5. Haftung</h2>
  <p>Für unentgeltliche Leistungen haften wir nur bei Vorsatz und grober Fahrlässigkeit (vgl. §§ 521, 599 BGB). Unbeschränkt haften wir für Schäden aus der Verletzung von Leben, Körper oder Gesundheit sowie nach dem Produkthaftungsgesetz. Die Lerninhalte sind sorgfältig erstellt, ersetzen aber keinen Sprachkurs und können Fehler enthalten.</p>

  <h2>6. Schlussbestimmungen</h2>
  <p>Es gilt deutsches Recht. Bist du Verbraucher mit gewöhnlichem Aufenthalt in einem anderen Staat, bleiben dir die zwingenden Schutzvorschriften dieses Staates erhalten (Art. 6 Abs. 2 Rom-I-VO). Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.</p>
</LegalPage>
