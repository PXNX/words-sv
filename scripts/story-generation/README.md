# Story generation helpers

One-off Bun scripts that were used to write the German stories that bring in unused vocabulary
(`src/lib/story/germanStories.ts`), kept with their working files for reference. They used to live
in the repository root.

Run them from anywhere, e.g. `bun scripts/story-generation/compute_unused.ts`: each script
switches to the repository root for paths under `src/`, and reads and writes its own working files
(`unused_words.json`, `snippet_*.txt`, `stories_*.txt`, `germanStories.ts`) in this folder.

Typical flow:

1. `generate_stories.cjs` / `compute_unused.cjs` – find the level words no story uses yet (`unused_words.json`).
2. `gen_all.cjs` – write a prompt snippet per level (`snippet_<level>.txt`).
3. Write the stories (`stories_<level>.txt`), then `append_stories.cjs` / `add_snippet.cjs` to add them.
4. `verify_new.cjs`, `check_snippet.cjs`, `check_words.cjs` – check that the new stories use the words.

Known issue: `gen_a1.cjs` has a syntax error (it did before the move as well); `gen_all.cjs` covers
every level including A1.