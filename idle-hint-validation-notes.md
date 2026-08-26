# Idle Hint Validation Notes

On 2026-08-26, the local updated tutorial was opened with the Hindi interface active and the English practice round selected. The practice board preserved the fixed `PLANET · PEN · TEA` structure. The wheel bubbles visibly use the larger size, and the input rail has additional vertical space above the wheel. The board was left unsolved without further input for the delayed hint verification.

After 65 seconds without interaction, the localized Hindi hint button appeared at the top-left of the input rail. Selecting it replaced the normal input preview with the predefined English `TEA` definition from `definitions.en.json` and outlined the three still-empty vertical `TEA` cells in amber.

The Settings overlay was also checked with Hindi active. It presents a **Content** group for game language, level, lower-level inclusion, and backward writing, followed by an **App behavior** group for the interface locale, theme, vibration, tutorial restart, and completed-round count. The globe icon appears directly before the interface-language label.

The Vercel production release for commit `495bcfe` was opened with Malayalam active. Its Settings overlay displayed the same two grouped sections, with the globe directly before the interface-language label and no co-op controls or server routes.

On that live deployment, the unsolved German `GARTEN` round was left untouched for 65 seconds. The localized Malayalam hint button then appeared above the taller input rail; the six letter bubbles were visibly larger than the prior release. The next interaction was reserved for checking the definition and target-cell outline.

Selecting the live hint replaced the input preview with the predefined German `GARTEN` definition, “Ein Stück Land bei einem Haus, auf dem Pflanzen wachsen.” All six empty `GARTEN` cells were outlined in amber, confirming the complete published idle-hint flow.
