# WordCircle – Designrichtungen

## Drei Ansätze

| Theme Name | Very Brief Intro | Probability |
|---|---|---:|
| Papier & Tinte | Ein warmes, editoriales Rätselheft: klare Kästchen, graphische Linien und ein ausdrucksstarker Kreis. Die Interaktion fühlt sich wie ein sorgfältig gesetztes Printspiel an. | 0.07 |
| Spielbrett Atelier | Ein spielerisches Holz- und Filzbrett mit leichtem Materialgefühl und handgemachten Markierungen. Es erzeugt eine zugängliche, freundliche Konzentration. | 0.04 |
| Sternkarte | Ein ruhiges, dunkles Himmelsschema, in dem Buchstaben wie Konstellationen verbunden werden. Konzentriert, hochwertig und etwas geheimnisvoll. | 0.09 |

## Gewählte Richtung: Papier & Tinte

**Design Movement:** Editorial Game Design, inspiriert von zeitgenössischen Rätselmagazinen, Buchgestaltung und reduzierter Schweizer Typografie.

**Core Principles:**

1. Das Kreuzworträtselraster ist die primäre Lesefläche und erhält den deutlichsten Kontrast.
2. Der Buchstaben-Kreis wirkt als eigenständiges Interaktionsinstrument, nicht als dekoratives Icon.
3. Warme Papierflächen und präzise dunkelblaue Linien sorgen für Konzentration ohne visuelle Härte.
4. Gewonnene Wörter sind ein sichtbarer Fortschritt und werden mit einem lebendigen, aber kontrollierten Akzent markiert.

**Color Philosophy:** Ein cremefarbenes Papier bildet einen ruhigen Hintergrund, während tiefes Tintenblau die Struktur und Lesbarkeit trägt. Bernstein ist die einzigartige Spiel-Farbe: Er zeigt Berührung, Auswahl und Erfolg – wie ein mit Textmarker markiertes Lösungswort.

**Layout Paradigm:** Eine vertikale Spielseite mit einer schmalen, magazinartigen Kopfzeile. Das Kreuzworträtsel oben sitzt als einseitige Druckfläche in einer leichten Einfassung; darunter gliedert ein feiner Trenner die dynamische Buchstabenfläche. Die Informationszeile läuft am unteren Rand wie eine Seitenfußzeile.

**Signature Elements:**

1. Ein dünner blauer Rändelrahmen mit kurzen Markierungen wie auf einem Satzspiegel.
2. Bernsteinfarbene Auswahlspur, die Buchstaben im Kreis wie mit Tinte verbindet.
3. Ein kleines Monogramm aus zwei überlappenden Kreisen als grafische Marke ohne Schrift.

**Interaction Philosophy:** Jede Geste erhält direktes Feedback: Buchstaben heben sich an, die Linie folgt der Bewegung und das aktuell gebildete Wort steht stets lesbar über dem Kreis. Tastenbedienung dient als gleichwertige Alternative zum Wischen.

**Animation:** Auswahlzustände ändern sich über 160 ms mit einer federnden, kurzen Bewegung. Erfolgreiche Wörter erhalten einen einmaligen, dezenten Hintergrundimpuls. Bei falschen Wörtern wackelt ausschließlich das Raster 260 ms lang horizontal. Alle nicht-essenziellen Bewegungen respektieren `prefers-reduced-motion`.

**Typography System:** Für Überschriften wird `DM Serif Display` mit großzügigem Zeichenbild genutzt; Interface, Hinweise und Buchstaben nutzen `DM Sans` mit tabellarischen Ziffern. Großbuchstaben bleiben Wortkacheln und Schaltflächen vorbehalten; Erklärtexte bleiben bewusst normal gesetzt.

**Brand Essence:** WordCircle ist ein konzentriertes Wortspiel für Menschen, die kurze, haptisch wirkende Denkrätsel in Deutsch oder Englisch mögen. **Persönlichkeit:** präzise, warm, spielerisch.

**Brand Voice:** Überschriften sind knapp und einladend; CTAs beschreiben die nächste Bewegung konkret. Beispiele: „Zieh eine Spur durch die Buchstaben.“ und „Das nächste Rätsel wartet.“

**Wordmark & Logo:** Ein grafisches Symbol aus zwei überlappenden, unterschiedlich starken Kreisen mit einer gemeinsamen Schnittkante – als Anspielung auf Wortkreis und Kreuzung. Der Wordmark sitzt daneben in einer charaktervollen Serifenschrift und nicht in einer Standardsans.

**Signature Brand Color:** **Sonnen-Bernstein** – `#E6A527`.

## Style Decisions

- Keine generischen Hero-Illustrationen oder wiederholten Stockbilder: Das Spiel selbst ist das zentrale visuelle Element.
- Die App bleibt hell, kontrastreich und im Hochformat priorisiert; auf großen Displays bleibt die Spielbreite bewusst begrenzt.
- Die deutsche und englische Sprachfassung haben dieselbe visuelle Hierarchie und je eigene Wortlisten.
- Das Kreuzworträtsel ist stets die dominante Druckfläche; der Buchstaben-Kreis ist ein ebenso klar gezeichnetes Interaktionsinstrument.
- Steuerung, Zähler und Metadaten folgen der kompakten, linierten Typografie eines Rätselblatts; Bernstein ist Auswahl, Erfolg und Fortschritt vorbehalten.
