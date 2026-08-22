import { a1 as attributes, a2 as head, a3 as attr_class, e as escape_html, a0 as derived, a4 as attr, a5 as attr_style, a6 as ensure_array_like } from "../../chunks/index.js";
import { p as push_element, a as pop_element } from "../../chunks/dev.js";
import { F as FILENAME } from "../../chunks/constants.js";
const wordsDe = [
  {
    letters: ["B", "E", "S", "U", "C", "H"],
    words: ["BESUCH", "SUCHE", "BUCH", "BUS", "HEU", "HUB"]
  },
  {
    letters: ["K", "A", "R", "T", "E", "N"],
    words: ["KARTEN", "KARTE", "KANTE", "TANK", "KERN", "ART"]
  },
  {
    letters: ["W", "I", "N", "T", "E", "R"],
    words: ["WINTER", "WERT", "TIER", "REIN", "WIE", "EIN"]
  }
];
const wordsEn = [
  {
    letters: ["C", "A", "S", "T", "L", "E"],
    words: ["CASTLE", "CAST", "TALE", "LATE", "SEAL", "SALE"]
  },
  {
    letters: ["P", "L", "A", "N", "E", "T"],
    words: ["PLANET", "PLANE", "PLATE", "PLAN", "LATE", "NEAT"]
  },
  {
    letters: ["O", "R", "A", "N", "G", "E"],
    words: ["ORANGE", "RANGE", "GARN", "RAGE", "EGO", "ROAN"]
  }
];
Backspace_outline_rounded[FILENAME] = "~icons/material-symbols/backspace-outline-rounded.svelte";
function Backspace_outline_rounded($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      const { $$slots, $$events, ...p } = $$props;
      $$renderer2.push(`<svg${attributes({ viewBox: "0 0 24 24", width: "1.2em", height: "1.2em", ...p }, void 0, void 0, void 0, 3)}>`);
      push_element($$renderer2, "svg", 1, 37);
      $$renderer2.push(`<path fill="currentColor" d="m14 13.4l1.9 1.9q.275.275.7.275t.7-.275t.275-.7t-.275-.7L15.4 12l1.9-1.9q.275-.275.275-.7t-.275-.7t-.7-.275t-.7.275L14 10.6l-1.9-1.9q-.275-.275-.7-.275t-.7.275t-.275.7t.275.7l1.9 1.9l-1.9 1.9q-.275.275-.275.7t.275.7t.7.275t.7-.275zM9 20q-.475 0-.9-.213t-.7-.587l-4.5-6q-.4-.525-.4-1.2t.4-1.2l4.5-6q.275-.375.7-.587T9 4h11q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h11V6H9l-4.5 6zm3.25-6">`);
      push_element($$renderer2, "path", 1, 99);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
    },
    Backspace_outline_rounded
  );
}
Backspace_outline_rounded.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Translate_rounded[FILENAME] = "~icons/material-symbols/translate-rounded.svelte";
function Translate_rounded($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      const { $$slots, $$events, ...p } = $$props;
      $$renderer2.push(`<svg${attributes({ viewBox: "0 0 24 24", width: "1.2em", height: "1.2em", ...p }, void 0, void 0, void 0, 3)}>`);
      push_element($$renderer2, "svg", 1, 37);
      $$renderer2.push(`<path fill="currentColor" d="m15.075 18.95l-.85 2.425q-.1.275-.35.45t-.55.175q-.5 0-.812-.413t-.113-.912l3.8-10.05q.125-.275.375-.45t.55-.175h.75q.3 0 .55.175t.375.45L22.6 20.7q.2.475-.1.888t-.8.412q-.325 0-.562-.175t-.363-.475l-.85-2.4zM9.05 13.975L4.7 18.3q-.275.275-.687.288T3.3 18.3q-.275-.275-.275-.7t.275-.7l4.35-4.35q-.875-.875-1.588-2T4.75 8h2.1q.5.975 1 1.7t1.2 1.45q.825-.825 1.713-2.313T12.1 6H2q-.425 0-.712-.288T1 5t.288-.712T2 4h6V3q0-.425.288-.712T9 2t.713.288T10 3v1h6q.425 0 .713.288T17 5t-.288.713T16 6h-1.9q-.525 1.8-1.575 3.7t-2.075 2.9l2.4 2.45l-.75 2.05zM15.7 17.2h3.6l-1.8-5.1z">`);
      push_element($$renderer2, "path", 1, 99);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
    },
    Translate_rounded
  );
}
Translate_rounded.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Refresh_rounded[FILENAME] = "~icons/material-symbols/refresh-rounded.svelte";
function Refresh_rounded($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      const { $$slots, $$events, ...p } = $$props;
      $$renderer2.push(`<svg${attributes({ viewBox: "0 0 24 24", width: "1.2em", height: "1.2em", ...p }, void 0, void 0, void 0, 3)}>`);
      push_element($$renderer2, "svg", 1, 37);
      $$renderer2.push(`<path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V5q0-.425.288-.712T19 4t.713.288T20 5v5q0 .425-.288.713T19 11h-5q-.425 0-.712-.288T13 10t.288-.712T14 9h3.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.7 0 3.113-.862t2.187-2.313q.2-.35.563-.487t.737-.013q.4.125.575.525t-.025.75q-1.025 2-2.925 3.2T12 20">`);
      push_element($$renderer2, "path", 1, 99);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
    },
    Refresh_rounded
  );
}
Refresh_rounded.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Shuffle_rounded[FILENAME] = "~icons/material-symbols/shuffle-rounded.svelte";
function Shuffle_rounded($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      const { $$slots, $$events, ...p } = $$props;
      $$renderer2.push(`<svg${attributes({ viewBox: "0 0 24 24", width: "1.2em", height: "1.2em", ...p }, void 0, void 0, void 0, 3)}>`);
      push_element($$renderer2, "svg", 1, 37);
      $$renderer2.push(`<path fill="currentColor" d="M15 20q-.425 0-.712-.288T14 19t.288-.712T15 18h1.6l-2.475-2.475q-.3-.3-.287-.712t.312-.713t.713-.3t.712.3L18 16.55V15q0-.425.288-.712T19 14t.713.288T20 15v4q0 .425-.288.713T19 20zm-10.7-.3q-.275-.275-.275-.7t.275-.7L16.6 6H15q-.425 0-.712-.288T14 5t.288-.712T15 4h4q.425 0 .713.288T20 5v4q0 .425-.288.713T19 10t-.712-.288T18 9V7.4L5.7 19.7q-.275.275-.7.275t-.7-.275m-.025-14Q4 5.425 4 5t.275-.7t.687-.275t.713.275l4.2 4.175q.275.275.288.688t-.288.712q-.275.275-.7.275t-.7-.275z">`);
      push_element($$renderer2, "path", 1, 99);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
    },
    Shuffle_rounded
  );
}
Shuffle_rounded.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Auto_awesome_rounded[FILENAME] = "~icons/material-symbols/auto-awesome-rounded.svelte";
function Auto_awesome_rounded($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      const { $$slots, $$events, ...p } = $$props;
      $$renderer2.push(`<svg${attributes({ viewBox: "0 0 24 24", width: "1.2em", height: "1.2em", ...p }, void 0, void 0, void 0, 3)}>`);
      push_element($$renderer2, "svg", 1, 37);
      $$renderer2.push(`<path fill="currentColor" d="M19 8.3q-.125 0-.263-.075T18.55 8l-.8-1.75l-1.75-.8q-.15-.05-.225-.187T15.7 5q0-.125.075-.262T16 4.55l1.75-.8l.8-1.75q.05-.15.188-.225T19 1.7q.125 0 .263.075T19.45 2l.8 1.75l1.75.8q.15.05.225.188T22.3 5q0 .125-.075.263T22 5.45l-1.75.8l-.8 1.75q-.05.15-.188.225T19 8.3Zm0 14q-.125 0-.263-.075T18.55 22l-.8-1.75l-1.75-.8q-.15-.05-.225-.188T15.7 19q0-.125.075-.263T16 18.55l1.75-.8l.8-1.75q.05-.15.188-.225T19 15.7q.125 0 .263.075t.187.225l.8 1.75l1.75.8q.15.05.225.188T22.3 19q0 .125-.075.263T22 19.45l-1.75.8l-.8 1.75q-.05.15-.188.225T19 22.3ZM9 18.575q-.275 0-.525-.15T8.1 18l-1.6-3.5L3 12.9q-.275-.125-.425-.375T2.425 12q0-.275.15-.525T3 11.1l3.5-1.6L8.1 6q.125-.275.375-.425T9 5.425q.275 0 .525.15T9.9 6l1.6 3.5l3.5 1.6q.275.125.425.375t.15.525q0 .275-.15.525T15 12.9l-3.5 1.6L9.9 18q-.125.275-.375.425t-.525.15Z">`);
      push_element($$renderer2, "path", 1, 99);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
    },
    Auto_awesome_rounded
  );
}
Auto_awesome_rounded.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
_page[FILENAME] = "src/routes/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      const puzzleData = { de: wordsDe, en: wordsEn };
      const copy = {
        de: {
          label: "Wortkreis",
          kicker: "Wischrätsel",
          hint: "Zieh Buchstaben zusammen – jedes Wort öffnet einen neuen Weg.",
          found: "Gefunden",
          words: "Wörter",
          reset: "Neu starten",
          shuffle: "Mischen",
          undo: "Zurück",
          clear: "Leeren",
          next: "Nächster Kreis",
          allDone: "Alle Wörter gefunden. Schön gezogen!",
          correct: "Richtig:",
          wrong: "Kein Lösungswort:",
          puzzle: "Rätsel",
          language: "Deutsch",
          letters: "Buchstaben",
          swipeHelp: "Halte gedrückt und verbinde die Buchstaben in der richtigen Reihenfolge.",
          active: "Aktuelle Auswahl"
        },
        en: {
          label: "Word circle",
          kicker: "Swipe puzzle",
          hint: "Pull the letters together — each word opens a new way.",
          found: "Found",
          words: "words",
          reset: "Restart",
          shuffle: "Shuffle",
          undo: "Undo",
          clear: "Clear",
          next: "Next circle",
          allDone: "Every word is found. Nicely drawn!",
          correct: "Correct:",
          wrong: "Not a puzzle word:",
          puzzle: "Puzzle",
          language: "English",
          letters: "letters",
          swipeHelp: "Press and connect the letters in the right order.",
          active: "Current selection"
        }
      };
      let lang = "de";
      let puzzleIndex = 0;
      let arrangement = [0, 1, 2, 3, 4, 5];
      let selectedPath = [];
      let solvedWords = [];
      let shakeGrid = false;
      const currentPuzzle = derived(() => puzzleData[lang][puzzleIndex]);
      const labels = derived(() => copy[lang]);
      const circleLetters = derived(() => arrangement.map((index) => currentPuzzle().letters[index]));
      const grid = derived(() => createGrid(currentPuzzle().words));
      const solvedSet = derived(() => new Set(solvedWords));
      const allSolved = derived(() => solvedWords.length === currentPuzzle().words.length);
      const activeWord = derived(() => selectedPath.map((index) => circleLetters()[index]).join(""));
      const solvedCells = derived(() => {
        const keys = /* @__PURE__ */ new Set();
        grid().placements.filter((entry) => solvedSet().has(entry.word)).forEach((entry) => {
          entry.word.split("").forEach((_letter, index) => keys.add(cellKey(entry.row + (entry.orientation === "down" ? index : 0), entry.col + (entry.orientation === "across" ? index : 0))));
        });
        return keys;
      });
      const CIRCLE = 146;
      const LETTER_RADIUS = 109;
      function cellKey(row, col) {
        return `${row}:${col}`;
      }
      function createGrid(words) {
        const orderedWords = [...words].sort((a, b) => b.length - a.length);
        const cells = /* @__PURE__ */ new Map();
        const placements = [];
        function write(entry) {
          placements.push(entry);
          entry.word.split("").forEach((letter, index) => {
            const row = entry.row + (entry.orientation === "down" ? index : 0);
            const col = entry.col + (entry.orientation === "across" ? index : 0);
            const key = cellKey(row, col);
            const cell = cells.get(key);
            cells.set(key, { letter, words: [...cell?.words ?? [], entry.word] });
          });
        }
        function canWrite(word, row, col, orientation) {
          return word.split("").every((letter, index) => {
            const key = cellKey(row + (orientation === "down" ? index : 0), col + (orientation === "across" ? index : 0));
            const existing = cells.get(key);
            return !existing || existing.letter === letter;
          });
        }
        const first = orderedWords.shift();
        if (first) write({ word: first, row: 0, col: 0, orientation: "across" });
        orderedWords.forEach((word) => {
          let candidate = null;
          for (const placed of placements) {
            for (let placedIndex = 0; placedIndex < placed.word.length; placedIndex += 1) {
              for (let wordIndex = 0; wordIndex < word.length; wordIndex += 1) {
                if (placed.word[placedIndex] !== word[wordIndex]) continue;
                const orientation = placed.orientation === "across" ? "down" : "across";
                const row = placed.orientation === "across" ? placed.row - wordIndex : placed.row + placedIndex;
                const col = placed.orientation === "across" ? placed.col + placedIndex : placed.col - wordIndex;
                if (canWrite(word, row, col, orientation)) {
                  candidate = { word, row, col, orientation };
                  break;
                }
              }
              if (candidate) break;
            }
            if (candidate) break;
          }
          write(candidate ?? {
            word,
            row: placements.length * 2,
            col: 0,
            orientation: "across"
          });
        });
        const rows = [...cells.keys()].map((key) => Number(key.split(":")[0]));
        const cols = [...cells.keys()].map((key) => Number(key.split(":")[1]));
        return {
          cells,
          placements,
          minRow: Math.min(...rows),
          maxRow: Math.max(...rows),
          minCol: Math.min(...cols),
          maxCol: Math.max(...cols)
        };
      }
      function position(index, total) {
        const angle = index / total * Math.PI * 2 - Math.PI / 2;
        return {
          x: CIRCLE + LETTER_RADIUS * Math.cos(angle),
          y: CIRCLE + LETTER_RADIUS * Math.sin(angle)
        };
      }
      function pathPoints() {
        return selectedPath.map((index) => {
          const point = position(index, circleLetters().length);
          return `${point.x},${point.y}`;
        }).join(" ");
      }
      function inRange(row, col) {
        return grid().cells.get(cellKey(row, col));
      }
      head("1uha8ag", $$renderer2, ($$renderer3) => {
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(labels().label)} · WordCircle</title>`);
        });
      });
      $$renderer2.push(`<main class="game-shell svelte-1uha8ag">`);
      push_element($$renderer2, "main", 218, 0);
      $$renderer2.push(`<section class="game-paper svelte-1uha8ag" aria-labelledby="game-title">`);
      push_element($$renderer2, "section", 219, 2);
      $$renderer2.push(`<header class="masthead svelte-1uha8ag">`);
      push_element($$renderer2, "header", 220, 4);
      $$renderer2.push(`<a class="brand svelte-1uha8ag" href="/" aria-label="WordCircle – Neustart">`);
      push_element($$renderer2, "a", 221, 6);
      $$renderer2.push(`<img src="/manus-storage/wordcircle-mark_bde1bc7c.png" alt="" class="svelte-1uha8ag"/>`);
      push_element($$renderer2, "img", 222, 8);
      pop_element();
      $$renderer2.push(` <span class="svelte-1uha8ag">`);
      push_element($$renderer2, "span", 223, 8);
      $$renderer2.push(`WordCircle</span>`);
      pop_element();
      $$renderer2.push(`</a>`);
      pop_element();
      $$renderer2.push(` <div class="language-switch svelte-1uha8ag" aria-label="Sprache / Language">`);
      push_element($$renderer2, "div", 225, 6);
      $$renderer2.push(`<button${attr_class("svelte-1uha8ag", void 0, { "chosen": lang === "de" })}>`);
      push_element($$renderer2, "button", 226, 8);
      $$renderer2.push(`DE</button>`);
      pop_element();
      $$renderer2.push(` <button${attr_class("svelte-1uha8ag", void 0, { "chosen": lang === "en" })}>`);
      push_element($$renderer2, "button", 227, 8);
      $$renderer2.push(`EN</button>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</header>`);
      pop_element();
      $$renderer2.push(` <div class="title-row svelte-1uha8ag">`);
      push_element($$renderer2, "div", 231, 4);
      $$renderer2.push(`<div class="svelte-1uha8ag">`);
      push_element($$renderer2, "div", 232, 6);
      $$renderer2.push(`<p class="eyebrow svelte-1uha8ag">`);
      push_element($$renderer2, "p", 233, 8);
      $$renderer2.push(`${escape_html(labels().kicker)} · ${escape_html(labels().puzzle)} ${escape_html(puzzleIndex + 1)}/3</p>`);
      pop_element();
      $$renderer2.push(` <h1 id="game-title" class="svelte-1uha8ag">`);
      push_element($$renderer2, "h1", 234, 8);
      $$renderer2.push(`${escape_html(labels().label)}</h1>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="score svelte-1uha8ag"${attr("aria-label", `${labels().found} ${solvedWords.length} ${labels().words}`)}>`);
      push_element($$renderer2, "div", 236, 6);
      $$renderer2.push(`<span class="svelte-1uha8ag">`);
      push_element($$renderer2, "span", 237, 8);
      $$renderer2.push(`${escape_html(labels().found)}</span>`);
      pop_element();
      $$renderer2.push(`<strong class="svelte-1uha8ag">`);
      push_element($$renderer2, "strong", 237, 35);
      $$renderer2.push(`${escape_html(solvedWords.length)}/${escape_html(currentPuzzle().words.length)}</strong>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div${attr_class("crossword-frame svelte-1uha8ag", void 0, { "shake": shakeGrid })} aria-label="Kreuzworträtsel">`);
      push_element($$renderer2, "div", 241, 4);
      $$renderer2.push(`<div class="crossword svelte-1uha8ag"${attr_style(`grid-template-columns: repeat(${grid().maxCol - grid().minCol + 1}, 1fr);`)}>`);
      push_element($$renderer2, "div", 242, 6);
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(Array(grid().maxRow - grid().minRow + 1));
      for (let rowIndex = 0, $$length = each_array.length; rowIndex < $$length; rowIndex++) {
        each_array[rowIndex];
        $$renderer2.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(Array(grid().maxCol - grid().minCol + 1));
        for (let colIndex = 0, $$length2 = each_array_1.length; colIndex < $$length2; colIndex++) {
          each_array_1[colIndex];
          const row = grid().minRow + rowIndex;
          const col = grid().minCol + colIndex;
          const cell = inRange(row, col);
          if (cell) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<div${attr_class("crossword-cell svelte-1uha8ag", void 0, { "solved": solvedCells().has(cellKey(row, col)) })}${attr("aria-label", solvedCells().has(cellKey(row, col)) ? cell.letter : "leeres Feld")}>`);
            push_element($$renderer2, "div", 249, 14);
            $$renderer2.push(`${escape_html(solvedCells().has(cellKey(row, col)) ? cell.letter : "")}</div>`);
            pop_element();
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<div class="crossword-void svelte-1uha8ag">`);
            push_element($$renderer2, "div", 253, 14);
            $$renderer2.push(`</div>`);
            pop_element();
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="frame-corner top-left svelte-1uha8ag">`);
      push_element($$renderer2, "div", 258, 6);
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`<div class="frame-corner top-right svelte-1uha8ag">`);
      push_element($$renderer2, "div", 258, 47);
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`<div class="frame-corner bottom-left svelte-1uha8ag">`);
      push_element($$renderer2, "div", 258, 89);
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`<div class="frame-corner bottom-right svelte-1uha8ag">`);
      push_element($$renderer2, "div", 258, 133);
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="selection-area svelte-1uha8ag" aria-live="polite">`);
      push_element($$renderer2, "div", 261, 4);
      $$renderer2.push(`<span class="selection-label svelte-1uha8ag">`);
      push_element($$renderer2, "span", 262, 6);
      $$renderer2.push(`${escape_html(labels().active)}</span>`);
      pop_element();
      $$renderer2.push(` <div${attr_class("selected-word svelte-1uha8ag", void 0, { "has-word": activeWord().length > 0 })}>`);
      push_element($$renderer2, "div", 263, 6);
      $$renderer2.push(`${escape_html(activeWord() || "—")}</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="svelte-1uha8ag">`);
        push_element($$renderer2, "p", 270, 8);
        $$renderer2.push(`${escape_html(labels().hint)}</p>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="wheel-stage svelte-1uha8ag">`);
      push_element($$renderer2, "div", 274, 4);
      $$renderer2.push(`<img class="wheel-stamp svelte-1uha8ag" src="/manus-storage/wordcircle-stamp_6a958b9b.png" alt=""/>`);
      push_element($$renderer2, "img", 275, 6);
      pop_element();
      $$renderer2.push(` <svg viewBox="0 0 292 292" class="letter-wheel svelte-1uha8ag" role="application"${attr("aria-label", labels().swipeHelp)}>`);
      push_element($$renderer2, "svg", 276, 6);
      $$renderer2.push(`<circle${attr("cx", CIRCLE)}${attr("cy", CIRCLE)}${attr("r", LETTER_RADIUS)} class="outer-ring svelte-1uha8ag">`);
      push_element($$renderer2, "circle", 277, 8);
      $$renderer2.push(`</circle>`);
      pop_element();
      $$renderer2.push(`<circle${attr("cx", CIRCLE)}${attr("cy", CIRCLE)} r="68" class="inner-ring svelte-1uha8ag">`);
      push_element($$renderer2, "circle", 278, 8);
      $$renderer2.push(`</circle>`);
      pop_element();
      $$renderer2.push(`<circle${attr("cx", CIRCLE)}${attr("cy", CIRCLE)} r="47" class="core-ring svelte-1uha8ag">`);
      push_element($$renderer2, "circle", 279, 8);
      $$renderer2.push(`</circle>`);
      pop_element();
      $$renderer2.push(`<path d="M124 146a22 22 0 1 0 44 0a22 22 0 1 1-44 0Z" class="core-mark svelte-1uha8ag">`);
      push_element($$renderer2, "path", 280, 8);
      $$renderer2.push(`</path>`);
      pop_element();
      if (selectedPath.length > 1) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<polyline${attr("points", pathPoints())} class="selection-line svelte-1uha8ag">`);
        push_element($$renderer2, "polyline", 282, 10);
        $$renderer2.push(`</polyline>`);
        pop_element();
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--><!--[-->`);
      const each_array_2 = ensure_array_like(circleLetters());
      for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
        let letter = each_array_2[index];
        const point = position(index, circleLetters().length);
        $$renderer2.push(`<g${attr("transform", `translate(${point.x} ${point.y})`)}${attr_class("letter-node svelte-1uha8ag", void 0, { "active": selectedPath.includes(index) })} role="button" tabindex="0"${attr("aria-label", `Buchstabe ${letter}`)}>`);
        push_element($$renderer2, "g", 286, 10);
        $$renderer2.push(`<circle r="26" class="svelte-1uha8ag">`);
        push_element($$renderer2, "circle", 287, 12);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<text text-anchor="middle" dominant-baseline="central" class="svelte-1uha8ag">`);
        push_element($$renderer2, "text", 288, 12);
        $$renderer2.push(`${escape_html(letter)}</text>`);
        pop_element();
        $$renderer2.push(`</g>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></svg>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="controls svelte-1uha8ag" aria-label="Spielsteuerung">`);
      push_element($$renderer2, "div", 294, 4);
      $$renderer2.push(`<button class="btn btn-ghost btn-sm editorial-control svelte-1uha8ag"${attr("disabled", selectedPath.length === 0, true)}>`);
      push_element($$renderer2, "button", 295, 6);
      Backspace_outline_rounded($$renderer2, {});
      $$renderer2.push(`<!---->${escape_html(labels().undo)}</button>`);
      pop_element();
      $$renderer2.push(` <button class="btn btn-ghost btn-sm editorial-control svelte-1uha8ag"${attr("disabled", selectedPath.length === 0, true)}>`);
      push_element($$renderer2, "button", 296, 6);
      $$renderer2.push(`${escape_html(labels().clear)}</button>`);
      pop_element();
      $$renderer2.push(` <button class="btn btn-ghost btn-sm editorial-control svelte-1uha8ag">`);
      push_element($$renderer2, "button", 297, 6);
      Shuffle_rounded($$renderer2, {});
      $$renderer2.push(`<!---->${escape_html(labels().shuffle)}</button>`);
      pop_element();
      $$renderer2.push(` <button class="btn btn-outline btn-sm editorial-control svelte-1uha8ag">`);
      push_element($$renderer2, "button", 298, 6);
      Refresh_rounded($$renderer2, {});
      $$renderer2.push(`<!---->${escape_html(labels().reset)}</button>`);
      pop_element();
      $$renderer2.push(` <button class="btn btn-primary btn-sm editorial-control next-button svelte-1uha8ag"${attr("disabled", !allSolved(), true)}>`);
      push_element($$renderer2, "button", 299, 6);
      Auto_awesome_rounded($$renderer2, {});
      $$renderer2.push(`<!---->${escape_html(labels().next)}</button>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <footer class="game-footer svelte-1uha8ag">`);
      push_element($$renderer2, "footer", 302, 4);
      Translate_rounded($$renderer2, {});
      $$renderer2.push(`<!----><span class="svelte-1uha8ag">`);
      push_element($$renderer2, "span", 302, 48);
      $$renderer2.push(`${escape_html(labels().language)}</span>`);
      pop_element();
      $$renderer2.push(`<span aria-hidden="true" class="svelte-1uha8ag">`);
      push_element($$renderer2, "span", 302, 78);
      $$renderer2.push(`•</span>`);
      pop_element();
      $$renderer2.push(`<span class="svelte-1uha8ag">`);
      push_element($$renderer2, "span", 302, 111);
      $$renderer2.push(`${escape_html(currentPuzzle().letters.length)} ${escape_html(labels().letters)}</span>`);
      pop_element();
      $$renderer2.push(`</footer>`);
      pop_element();
      $$renderer2.push(` `);
      if (allSolved()) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<img class="confetti svelte-1uha8ag" src="/manus-storage/wordcircle-confetti_5d6d6ed6.png" alt=""/>`);
        push_element($$renderer2, "img", 303, 19);
        pop_element();
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></section>`);
      pop_element();
      $$renderer2.push(`</main>`);
      pop_element();
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
