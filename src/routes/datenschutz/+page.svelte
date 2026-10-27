<script lang="ts">
  import LegalPage from '#lib/legal/LegalPage.svelte';
  import { operator } from '#lib/legal/operator.js';
</script>

<LegalPage title="Datenschutzerklärung" kicker="Datenschutz">
  <h2>1. Verantwortlicher</h2>
  <p>Verantwortlich im Sinne der DSGVO ist {operator.name}, {operator.street}, {operator.city}, E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>. Ein Datenschutzbeauftragter ist nicht bestellt, weil keine gesetzliche Pflicht dazu besteht.</p>

  <h2>2. Grundsatz</h2>
  <p>WordCircle funktioniert ohne Konto, ohne Tracking und ohne Werbung. Dein Lernfortschritt, deine Einstellungen und heruntergeladene Stimmen bleiben im Speicher deines Browsers (Local Storage, IndexedDB); höchstens ein Cookie merkt sich deine Oberflächensprache. Dieser Speicher ist für die von dir gewünschte Funktion unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst ihn jederzeit über die Browser-Einstellungen löschen.</p>

  <h2>3. Hosting und Server-Logs</h2>
  <p>Die Web-App wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA, gehostet. Beim Aufruf verarbeitet Vercel technisch notwendige Daten wie IP-Adresse, Zeitpunkt, aufgerufene Seite und Browserkennung, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Vercel ist nach dem EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO); zusätzlich bestehen Standardvertragsklauseln.</p>

  <h2>4. Tagesserie und Erinnerungen</h2>
  <p>Damit deine Tagesserie geräteübergreifend stabil bleibt und Erinnerungen zur richtigen Uhrzeit kommen, speichern wir zu einer zufällig erzeugten Geräte-ID: Zeitzone, Oberflächensprache, Tageszähler deiner Übungen, Serienstand, Schutz- und Glutstand sowie den Zeitpunkt der letzten Synchronisierung. Die Geräte-ID enthält keinen Namen und keine Kontaktdaten. Rechtsgrundlage ist die Bereitstellung der von dir genutzten Funktion (Art. 6 Abs. 1 lit. b DSGVO). Auf Anfrage löschen wir diese Daten jederzeit.</p>
  <p>Push-Benachrichtigungen erhältst du nur, wenn du sie in den Einstellungen aktivierst (Art. 6 Abs. 1 lit. a DSGVO). Dafür speichern wir die Push-Adresse deines Browsers. Die Nachrichten werden über den Push-Dienst deines Browserherstellers zugestellt (z. B. Google, Mozilla, Apple). Du kannst die Einwilligung jederzeit widerrufen, indem du Erinnerungen ausschaltest oder die Berechtigung im Browser entziehst.</p>

  <h2>5. Dienste, die du selbst auslöst</h2>
  <p>Einige Funktionen laden Inhalte von Dritten, und zwar erst dann, wenn du sie nutzt. Dabei wird deine IP-Adresse an den jeweiligen Anbieter übertragen (Art. 6 Abs. 1 lit. b DSGVO):</p>
  <ul>
    <li><strong>Natürliche Stimmen auf dem Gerät:</strong> Sprachmodelle und Programmbibliotheken werden von Hugging Face (Hugging Face Inc., USA) und jsDelivr (Prospect One, Polen) geladen. Die Sprachausgabe selbst läuft danach auf deinem Gerät.</li>
    <li><strong>Edge-Stimmen:</strong> Wählst du diese Stimmen, werden die vorzulesenden Sätze an Microsoft (Microsoft Ireland Operations Ltd., Irland) gesendet und als Audio zurückgegeben.</li>
    <li><strong>Aussprache-Training:</strong> Die Spracherkennung nutzt die Spracherkennung deines Browsers. Je nach Browser wird die Aufnahme dabei an dessen Hersteller übertragen (in Chrome an Google). Das Mikrofon wird nur nach deiner Freigabe genutzt.</li>
    <li><strong>Wörterbuch:</strong> Bei Worterklärungen werden Einträge von Wiktionary (Wikimedia Foundation Inc., USA) abgerufen.</li>
  </ul>

  <h2>6. Telegram-Bot, Mini-App und Spenden</h2>
  <p>Unser Bot <a href={operator.telegram} rel="noopener">@word_circle_bot</a> und die zugehörige Mini-App laufen über Telegram (Telegram FZ-LLC, Dubai, VAE). Wenn du den Bot nutzt, verarbeiten wir deine Telegram-Nutzer-ID, deinen Vornamen, deine Spracheinstellung und deine Nachrichten an den Bot, um dir zu antworten (Art. 6 Abs. 1 lit. b DSGVO). Die Mini-App erhält von Telegram signierte Anmeldedaten (Nutzer-ID, Name, Sprache); daran erkennen wir dich, ohne dass du ein Passwort brauchst. Öffnest du WordCircle als Mini-App, übernimmt die App deinen Vornamen und deine Sprache aus Telegram, solange du keine eigenen eingestellt hast, und wir verknüpfen deine Geräte-ID mit deiner Telegram-Nutzer-ID (und, wenn du dem Bot das Schreiben erlaubt hast, mit deinem Chat), damit du Telegram-Erinnerungen mit einem Tipp einschalten kannst. Erinnerungen bekommst du trotzdem erst, wenn du sie einschaltest.</p>
  <p>Spenden erfolgen ausschließlich mit Telegram Stars. Die Zahlung wickeln Telegram bzw. die App-Stores ab; Zahlungsdaten wie Karten- oder Kontonummern erhalten wir nicht. Wir speichern Nutzer-ID, Betrag, Zeitpunkt und die Transaktions-ID von Telegram. Diese Angaben bewahren wir wegen handels- und steuerrechtlicher Aufbewahrungspflichten bis zu 10 Jahre auf (Art. 6 Abs. 1 lit. c DSGVO i. V. m. § 147 AO, § 257 HGB). Für die Verarbeitung durch Telegram gilt die <a href="https://telegram.org/privacy" rel="noopener">Datenschutzerklärung von Telegram</a>.</p>

  <p>Schaltest du in den Einstellungen die Telegram-Erinnerung ein, verknüpfen wir deine Geräte-ID mit deiner Telegram-Nutzer-ID und Chat-ID, um dir vor Ablauf deiner Tagesserie eine Nachricht zu schicken (Art. 6 Abs. 1 lit. a DSGVO). Du kannst sie jederzeit in den Einstellungen ausschalten oder den Bot blockieren. Startet jemand den Bot über deinen Einladungslink, speichern wir seine Telegram-Nutzer-ID zusammen mit deiner Geräte-ID, damit jede Einladung nur einmal belohnt wird (Art. 6 Abs. 1 lit. b DSGVO).</p>

  <h2>7. Deine Rechte</h2>
  <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Schreib dafür an <a href={`mailto:${operator.email}`}>{operator.email}</a>. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), etwa bei der Behörde deines Wohnorts.</p>
  <p>Eine automatisierte Entscheidungsfindung oder ein Profiling findet nicht statt.</p>
</LegalPage>
