# WordCircle

Ein zweisprachiges SvelteKit-Wortspiel mit DaisyUI und Unplugin Icons. Ziehe Buchstaben in der richtigen Reihenfolge, um Wörter zu bilden und ein sich kreuzendes Raster zu füllen.

## Lokale Entwicklung

```bash
bun install
bun run dev
```

Die Spieloberfläche befindet sich vollständig in `src/routes/+page.svelte`. Rätsel liegen nach Sprache und CEFR-Niveau getrennt in `src/lib/data/words.{de,en}.{a1–c2}.json` vor.

## Wortquellen und Erklärungen

Die deutsche Vokabelkurierung verwendet Lemma-Daten aus [gambolputty/german-nouns](https://github.com/gambolputty/german-nouns) (CC BY-SA 4.0), nach Häufigkeit priorisiert mit [olastor/german-word-frequencies](https://github.com/olastor/german-word-frequencies) (DeReKo/DECOW, CC BY 4.0). Die Zuordnung von Verbformen richtet sich nach den Wiktionary-basierten Kategorien aus [ynsrc/german-categorized-wordlist](https://github.com/ynsrc/german-categorized-wordlist). Nach einer richtigen Lösung führt die Fragezeichen-Schaltfläche zum passenden Eintrag im [Wiktionary](https://de.wiktionary.org/).

## CEFR-Zuordnung

Die aktuell ausgelieferten Wortlisten werden nicht mehr aus Häufigkeitsbändern abgeleitet. Sie entstehen mit `node tools/align-cefr-vocabulary.mjs` aus einer dokumentierten CEFR-Evidenzhierarchie und werden mit `node tools/verify-cefr-provenance.mjs` geprüft. Die vollständige Methodik, Quellen, Attributionen und die notwendige Einschränkung – CEFR veröffentlicht keine universelle wortgenaue Liste für alle Sprachen – stehen in [VOCABULARY_LEVELS.md](./VOCABULARY_LEVELS.md). Die Frequenz- und Kategorienquellen bleiben für frühere Kuration und allgemeine Lemmata dokumentiert, sind jedoch keine Grundlage der aktuellen Niveauzuordnung.

## Vercel

Die App wird als statische SvelteKit-Seite gebaut. `vercel.json` legt Bun 1.4, den Build-Befehl und den erzeugten Ausgabeordner `build` ausdrücklich fest.

## PWA und Offline-Nutzung

WordCircle erzeugt beim Build ein Web-App-Manifest und einen Service Worker. Nach dem ersten erfolgreichen Aufruf kann die veröffentlichte Seite über die Browserfunktion **App installieren** zum Startbildschirm hinzugefügt werden; die Spieloberfläche und ihre lokalen Ressourcen bleiben anschließend offline verfügbar.

Beim Start prüft die installierte App sofort, ob ein neuer Service Worker bereitsteht, übernimmt ihn vor dem Spielen und lädt neu. Ein Neuladen liefert damit den aktuellen Build. Läuft die App bereits, wird bewusst nicht mitten im Spiel neu geladen; stattdessen erscheint der Update-Hinweis auf der Startseite. Die Prüfung erfolgt beim Fokuswechsel und alle fünf Minuten. In einem bereits geöffneten Fenster kann es daher bis zum Erscheinen dieses Hinweises dauern; erst nach dem Bestätigen wird der neue Build geladen. Für die einmalige Umstellung von der bisherigen Cache-Strategie kann in einer schon installierten App noch der bisherige Update-Hinweis nötig sein.
