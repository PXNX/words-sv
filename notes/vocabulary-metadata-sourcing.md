# Vocabulary metadata sources

## Data contract

Each vocabulary entry is represented as a structured object with a display lemma, `type`, optional `gender`, and optional `rarity` metadata. The game continues to use the normalized lemma as its matching and spaced-repetition key, so changing the catalog shape does not change a learner’s answer history.

## Rarity mapping

Duden documents five computer-generated frequency classes based on the Dudenkorpus. The corpus is described as containing more than five billion word forms from varied German text types over the preceding 25 years. The documented thresholds are `>1000`, `>100`, `>10`, `>1`, and `<1` occurrence per million word forms. The application preserves that provenance using a five-step `dudenClass` field and derives neutral labels such as `very_common`, `common`, `established`, `uncommon`, and `seldom` for display or filtering. It does not infer a Duden class where no verified per-word Duden value has been retrieved. [1]

The supplied `ynsrc/german-categorized-wordlist` repository is treated as a categorization reference, not as permission to copy its third-party contents wholesale. Its `sources` README identifies third-party open-source inputs, notes a CC BY-SA 4.0 license for that folder, and asks downstream users to check individual source licenses. [2]

## Direct entry verification

The public Duden entry for **Haus** explicitly identifies it as `Substantiv, Neutrum` and displays the frequency indicator. Its four filled bars were recorded as `dudenClass: 4` (`common`, meaning more than 100 per million under the documented scale). The same one-entry-at-a-time process then verified the Duden classes used for Garten, Fenster, Freundin, Sprache, Meinung, Partei, Gewissen, Beispiel, Student, Gewalt, Beitrag, Theorie, Verbot, Stand, and Gas. The schema leaves `rarity` absent rather than guessing when an entry did not yield an individual indicator. [3]

## References

[1] [Duden: Häufigkeit](https://www.duden.de/hilfe/haeufigkeit)

[2] [ynsrc/german-categorized-wordlist — sources](https://github.com/ynsrc/german-categorized-wordlist/tree/main/sources)

[3] [Duden: Haus](https://www.duden.de/rechtschreibung/Haus)
