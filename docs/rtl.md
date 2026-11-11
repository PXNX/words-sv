# Right-to-left interface

Persian (`fa`) and Arabic (`ar`) run the interface right to left. How it is wired:

- `src/app.html` renders `dir` from Paraglide, and `routes/+layout.svelte` updates
  `document.documentElement.dir` when the interface language changes.
- Text in the language being learnt keeps its own direction: practice words, sentences and reading
  texts carry `lang` and `dir="ltr"` where the learnt language is written left to right.
- Spacing, borders and text alignment use logical properties (`margin-inline-*`, `padding-inline`,
  `border-inline-start`, `text-align: start`, `inset-inline-*`, Tailwind `ms-`/`me-`/`start-`/`end-`).
  `tests/rtl-css.test.ts` fails on `margin-left`, `padding-right`, `border-left`,
  `text-align: left/right` and `ml-`/`mr-`/`pl-`/`pr-` classes in Svelte files.
- Arrows and chevrons that point "forward" or "back" carry `rtl:rotate-180`.
- Decorative positions stay physical: `left: 50%` with `translateX(-50%)` for centring, confetti,
  sparkles and the scenery in stories and listening, which do not have a reading direction.

## Checked

| Area | Result |
|---|---|
| App shell, home button, toolbars, offline pill, background jobs badge | Logical insets |
| Settings (rows, select menus, links), model list | Logical, chevrons mirrored |
| Progress, coach steps, store link | Arrows mirrored |
| Story narration bar, auto-read button, avatar editor | Logical borders and insets |
| Reading navigation (previous/next) | Chevrons mirrored |
| Writing, mock test, placement | `text-align: start`, learnt text with its own `dir` |

## Open

- The `fa` and `ar` message files cover about a third of the keys; the rest falls back to German.
