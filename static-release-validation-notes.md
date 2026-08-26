# Static Release Validation Notes

The static release was validated on 2026-08-26 after the co-op scope was removed. `pnpm run check` completed with zero diagnostics and a Bun 1.4 production build completed through `@sveltejs/adapter-static`, writing the `build` output with `manifest.webmanifest` and `sw.js`.

The local first-run interface was viewed with Hindi selected. It displayed Hindi onboarding copy, the interface-locale dropdown included Hindi and Malayalam, and the tutorial still constrained playable puzzle-language choices to **DE** and **EN**. Starting the tutorial opened the fixed English three-word practice board with the `PLANET · PEN · TEA` hint pattern.

The published Vercel deployment for commit `2ee7983` rendered the standard WordCircle board with the Settings control and no co-op share control. A production `POST /api/coop` request returned `404`, confirming that the removed serverless co-op endpoint is not present in the static release. The retained input CSS uses a static amber active-letter state with `transform: scale(1.22)` and contains no co-op UI dependencies.

On the published site, Malayalam was selected from Settings and became active immediately. The Settings heading, game- and interface-language labels, level, appearance, vibration, backward-writing, tutorial-restart, and completed-round labels all rendered in Malayalam, while the playable puzzle-language choices remained **DE** and **EN**.
