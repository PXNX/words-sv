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

Die App verwendet `@sveltejs/adapter-vercel`. `vercel.json` legt Bun 1.4 und den Build-Befehl fest; Vercel veröffentlicht die Spieloberfläche sowie die SvelteKit-Serverfunktionen für gemeinsame Runden.

### Gemeinsame Runden

Eine Runde kann über die Teilen-Schaltfläche als zeitlich begrenzte Einladung geteilt werden. Die Serverfunktionen erwarten eine PostgreSQL-kompatible `DATABASE_URL` in Vercel. Beim ersten Aufruf werden die Tabellen für Räume, Teilnehmende und Ereignisse angelegt. Rätselzustand und Treffer liegen dauerhaft in der Datenbank; der Browser kombiniert einen SSE-Stream mit einem kurzen Snapshot-Polling als Wiederverbindungs-Fallback. Dadurch hängt die Synchronisierung nicht von einem einzelnen Funktionsprozess ab.

Gemeinsame Runden laufen nach 24 Stunden ab. Die Einladungskennung und eine anonyme Teilnehmendenkennung sind zufällig erzeugte URL-sichere Werte. Nur die auf dem Server gespeicherte Rundendefinition wird zur Annahme eines gelösten Wortes verwendet.

## PWA und Offline-Nutzung

WordCircle erzeugt beim Build ein Web-App-Manifest und einen Service Worker. Nach dem ersten erfolgreichen Aufruf kann die veröffentlichte Seite über die Browserfunktion **App installieren** zum Startbildschirm hinzugefügt werden; die Spieloberfläche und ihre lokalen Ressourcen bleiben anschließend offline verfügbar.
