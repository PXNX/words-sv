# Experiments on the device

WordCircle has no analytics backend, so an experiment here is small and honest about its limits.

## How it works

- `src/lib/experiments/experiments.ts` holds the registry (`EXPERIMENTS`) and the pure parts:
  `assignVariant` maps a random device id and the experiment's key to a variant (FNV-1a hash,
  weighted), so a device keeps its variant for good.
- `src/lib/experiments/experiments.svelte.ts` keeps the device id in `localStorage` and gives
  components `variant(key)`. `?exp=<key>:<variant>` in the address forces a variant for the
  session, for testing.
- Exposure is not logged separately. A card that carries a treatment says so on its learning
  event (`presentation: { image, animation }`, see `src/lib/progress/events.ts`), which answers
  pass through `recordReview(..., { presentation })`.
- `presentationReport(events, 'image' | 'animation')` compares the two arms: every answer that
  comes at least twelve hours after the previous card of the same item is credited to how that
  previous card was shown. The result is the share of right answers per arm and the difference.
- `/insights` shows this device's variant and the report for its own answers.

## Adding an experiment

1. Add an entry to `EXPERIMENTS` with its key, variants and the question it should answer.
2. Read it where the treatment happens: `variant('my-key') === 'on'`.
3. If the outcome is recall, pass `presentation` with the answer; for anything else, write a pure
   function over the event log next to `presentationReport` and test it.

## What it can and cannot show

One device only ever sees one variant of `teaching-animations`, so its own report compares
cards that had a rule chain with cards that had none, not the two variants against each other.
Comparing variants needs many devices, and their numbers never leave them. The report is
therefore a personal mirror ("pictures help me") and a tool for testers who switch the variant
with `?exp=`, not a statistical result. Pictures are different: the same learner meets words
with and without a picture, so that comparison holds within one device, with the caveat that
pictured words are the concrete, easier ones.

## Running experiments

| Key | Variants | Question |
|---|---|---|
| `teaching-animations` | `on`, `off` (50/50) | Does the animated rule chain after a case answer raise the share of right answers the next time the item comes up? |
