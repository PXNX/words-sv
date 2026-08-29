# Vocabulary-level evidence

## Important scope

> **CEFR defines language proficiency through can-do descriptors; it does not publish one universal word-to-level list for every language.** [1]

Words-sv therefore labels its small puzzle-word pools using a reproducible hierarchy of **CEFR-aligned evidence** rather than claiming that every individual word has an official universal classification. Each list is limited to source-attested lemmas that fit the game’s three-to-eight-character format. German special characters (`ẞ`, `Ä`, `Ö`, and `Ü`) are preserved.

| Language | Levels | Evidence used | How it is applied |
| --- | --- | --- | --- |
| German | A1–B1 | Goethe-Institut published examination word lists [2] and GerVLPro [3] | The candidate must occur in the relevant published list and have a matching conservative GerVLPro CEFR assignment. |
| German | B2–C2 | GerVLPro (LREC 2026) [3] | The candidate must have GerVLPro’s conservative `first_level_above_12_percent` assignment for the stated level. |
| English | A1–B2 | Open Language Profiles CEFR-J Vocabulary Profile 1.5 [4] | The candidate uses the profile’s declared CEFR band and part of speech. |
| English | C1–C2 | Octanove C1/C2 Vocabulary Profile 1.0 [4] | The candidate uses the profile’s declared CEFR band and part of speech. |
| English | Sample verification | Cambridge English Vocabulary Profile [5] | Individual sense-level checks validate the primary English reference without copying its protected bulk database. |

## Reproducible update

The checked-in lists are regenerated with:

```bash
node tools/align-cefr-vocabulary.mjs
```

The command reads reference sources held outside the web project under `/home/ubuntu/vocabulary-sources/` and produces `cefr-vocabulary-alignment-report.json`. The external data files are not packaged with the site.

## Limitations and playability

The generated alignment report records 5 source-backed German C2 entries and 398 English C2 entries within the puzzle’s character limit. The small German C2 set is retained rather than supplemented with unclassified general-frequency words. When a selected exact-level pool cannot produce a valid six-word crossword under the app’s letter-wheel rules, Words-sv automatically enables **Include lower levels**. The setting visibly reflects this behavior; advanced learners work cumulatively with earlier-level vocabulary, while the selected label continues to identify the requested CEFR band.

## References

[1]: https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions "Council of Europe: CEFR level descriptions"
[2]: https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf "Goethe-Institut A1 word list"; https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf "Goethe-Institut A2 word list"; https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf "Goethe-Institut B1 word list"
[3]: https://aclanthology.org/2026.lrec-1.935/ "Michael, Hülsing & Horbach (2026), GerVLPro"; https://github.com/noahmanu/gervlpro "GerVLPro released data"
[4]: https://github.com/openlanguageprofiles/olp-en-cefrj "Open Language Profiles: CEFR-J and Octanove English vocabulary profiles"
[5]: https://englishprofile.org/?menu=english-vocabulary-profile "English Profile: English Vocabulary Profile"
