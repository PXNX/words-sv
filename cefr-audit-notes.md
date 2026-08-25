# CEFR vocabulary audit notes

## Framework scope

The Council of Europe defines CEFR A1–C2 as language-independent, adaptable **can-do** proficiency descriptors rather than a universal fixed word-to-level inventory. Therefore, source-backed lists from recognized language-specific examination or profile providers are required to assign individual game words.

## German source access

The Goethe-Institut examination overview identifies its German examinations across CEFR A1–C2, but the public page blocked automated access with a CAPTCHA. The official A1 word-list PDF surfaced through search remains a usable primary source; additional accessible official examination word lists will be evaluated before editing the German files.

The official Goethe A1, A2, and B1 word-list PDFs provide the strongest usable German primary sources. The A1 list describes around 650 entries, and the B1 list states an inventory of approximately 2,400 lexical units. Their published lists are examination-oriented, include receptive vocabulary, and distinguish lexical entries from derivable forms; therefore, the game must use only source-attested, puzzle-suitable lemmas rather than infer level from word frequency.

For B2–C2, Goethe does not provide an equally accessible open word list. GerVLPro is an openly released, data-driven German CEFR resource that contains 4,015 lemma–part-of-speech assignments from A1 through C2. It is useful to validate advanced placement, but it is not an official CEFR inventory and should be labeled as an evidence-based supplementary source.

## English source

Cambridge’s English Profile is the authoritative primary reference for English: it is a Council of Europe-supported Reference Level Description and offers a searchable profile for words, meanings, phrases, idioms, and collocations by CEFR level. The free public interface supports audit-level lookup, but does not present a bulk-export word list; the audit must therefore retain only entries with verifiable profile or official Cambridge-exam evidence and document that limitation.

The EVP Online interface supports British/American selection, CEFR level filtering, and free word-level lookup. Its terms explicitly prohibit commercial promotion or use of the English Vocabulary Profile for commercial purposes. The game must not copy or republish the profile’s bulk vocabulary database; it can use documented lookups solely as evidence when auditing the small curated word lists.

The EVP lookup interface uses a public `POST /elasticsearch/search` endpoint. It will be used only for limited, individual-entry verification if required; it is not a sanctioned bulk-download route and will not be used to replicate the profile database.

Direct inspection of EVP Online confirms that its result table exposes **Base Word**, **Guideword**, **Level**, **Part of Speech**, and **Topic** for individual entries. For example, its initial result set distinguishes separate senses at B1, B2, C1, and C2. This validates the workflow of checking a limited curated set of English game words against their relevant sense rather than importing the full service output.

The supported EVP interface was tested with **garden**. It returned the ordinary noun sense at A1 and distinguished related entries at B2 and C1, confirming that a game word must be assigned by its intended sense rather than spelling alone.

## Coverage assessment

GerVLPro provides ample three-to-eight-character noun, verb, and adjective candidates through C1, but only five such entries under its conservative `first_level_above_12_percent` C2 label. This is evidence that C2 cannot be populated responsibly through a generic word-frequency split. The audit will retain advanced levels only where level evidence exists, and will not manufacture a large C2 list from unsupported words.

The Open Language Profiles CEFR-J release is a reproducible secondary English source with a permissive research/commercial-use notice requiring citation. It provides puzzle-safe candidates through B2, while its included Octanove extension supplies limited C1/C2 coverage. It will be used to create source-level candidate sets and cross-checked against selected English Profile lookups; it will not be described as the official English Profile.

## Source availability summary

| Language | Levels with strongest primary evidence | Supplementary evidence required |
| --- | --- | --- |
| German | Goethe A1, A2, B1 published examination word lists | GerVLPro for B2–C2, because no comparable open Goethe B2–C2 lexicon was found |
| English | English Vocabulary Profile lookup across A1–C2 | CEFR-J and Octanove open profiles for reproducible candidate generation and coverage |

## Local application checks

The rebuilt local game rendered a complete source-aligned German round headed by `ARBEITEN`, confirming that the revised data format preserves normal grid and wheel behavior. A subsequent local C2 selection was prepared with its stored lower-level option deliberately cleared. On reload, it produced a seven-word crossword headed by `ERLEBNIS` and persisted `includeLower=on`, confirming that the source-constrained pooling safeguard visibly enables prerequisite levels when required for playability.

## Research source access

The GerVLPro release repository contains the associated vocabulary resource under `GerVLPro/`. Its public README identifies the LREC 2026 paper and indicates source code is pending. The word-level resource is therefore suitable for a reproducible data review after its exact files and licensing are confirmed.

## Sources

1. Council of Europe, [The CEFR Levels](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions).
2. Goethe-Institut, [German examinations A1–C2](https://www.goethe.de/en/spr/prf.html).
3. Goethe-Institut, [Goethe-Zertifikat A1 Wortliste](https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf).
4. Goethe-Institut, [Goethe-Zertifikat A2 Wortliste](https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf).
5. Goethe-Institut, [Goethe-Zertifikat B1 Wortliste](https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf).
6. English Profile, [What the CEFR means for English](https://englishprofile.org/).
7. Michael, Hülsing & Horbach, [GerVLPro](https://aclanthology.org/2026.lrec-1.935/).
8. Michael, [GerVLPro resource repository](https://github.com/noahmanu/gervlpro).
