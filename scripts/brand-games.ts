// The 640x360 pictures BotFather asks for when a Telegram game is created (/newgame), one per group
// game (server/_lib/games.ts: wordle, hangman, vocab), in the style of brand/telegram-description.png:
// navy night, the logo's rings, a golden glow, Lilith, and the game itself in the middle.
// Writes brand/game-<id>.svg and .png, and a square 256px version of it as the bot's
// inline result thumbnail (static/telegram/game-<id>.png). Usage: bun scripts/brand-games.ts
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Lilith as StoryCharacter draws her, taken from brand-images.ts so both stay the same.
const brandScript = await readFile(join(root, 'scripts/brand-images.ts'), 'utf8');
const LILITH = /const LILITH = `([^`]+)`;/u.exec(brandScript)?.[1];
if (!LILITH) throw new Error('LILITH not found in scripts/brand-images.ts');
const lilith = (x: number, y: number, width: number) => `<svg x="${x}" y="${y}" width="${width}" height="${width * 1.25}" viewBox="0 0 120 150">${LILITH}</svg>`;

const NAVY = '#172a45';
const CREAM = '#fffdf7';
const GOLD = '#e6a527';
const GREEN = '#34824d';
const RED = '#c4522e';

function backdrop(): string {
  const dots: Array<[number, number, number, string]> = [[150, 38, 3.2, GOLD], [488, 30, 2.6, CREAM], [44, 160, 2.4, CREAM], [604, 182, 3, GOLD], [112, 318, 2.6, RED], [534, 330, 3.2, GREEN], [262, 22, 2, CREAM], [404, 344, 2, GOLD]];
  return `<defs><linearGradient id="night" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#21406a"/><stop offset=".55" stop-color="${NAVY}"/><stop offset="1" stop-color="#101e33"/></linearGradient><radialGradient id="glow" cx=".5" cy=".45" r=".45"><stop offset="0" stop-color="${GOLD}" stop-opacity=".45"/><stop offset=".6" stop-color="${GOLD}" stop-opacity=".1"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient></defs>
<rect width="640" height="360" fill="url(#night)"/>
<circle cx="70" cy="58" r="118" fill="none" stroke="${GOLD}" stroke-opacity=".14" stroke-width="30"/>
<circle cx="590" cy="318" r="104" fill="none" stroke="${CREAM}" stroke-opacity=".07" stroke-width="24"/>
<ellipse cx="320" cy="170" rx="300" ry="170" fill="url(#glow)"/>
${dots.map(([x, y, r, fill]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity=".85"/>`).join('')}`;
}

/** A letter tile; `fill` is the tile colour and `ink` the letter's. */
function tile(letter: string, x: number, y: number, size: number, fill = CREAM, ink = NAVY, angle = 0): string {
  return `<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="${-size / 2 + 3}" y="${-size / 2 + 4}" width="${size}" height="${size}" rx="${size * 0.2}" fill="#0e1b2e" opacity=".5"/><rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.2}" fill="${fill}"/>${letter ? `<text y="${size * 0.25}" text-anchor="middle" font-family="DM Sans 9pt" font-weight="800" font-size="${size * 0.6}" fill="${ink}">${letter}</text>` : ''}</g>`;
}

function title(text: string, subtitle: string): string {
  return `<text x="40" y="320" font-family="DM Serif Display" font-size="46" letter-spacing="-1.5" fill="${CREAM}">${text}</text>
<text x="42" y="342" font-family="DM Sans 9pt" font-weight="800" font-size="14" letter-spacing="2" fill="${GOLD}">${subtitle}</text>`;
}

const frame = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">${backdrop()}${body}</svg>`;

// Three guesses on the way to the word, the last one all green.
function wordleSvg(): string {
  const rows: Array<Array<[string, string]>> = [
    // HAFEN and BLANK on the way to KLANG, coloured as the game colours them.
    [['H', '#5b6577'], ['A', GOLD], ['F', '#5b6577'], ['E', '#5b6577'], ['N', GOLD]],
    [['B', '#5b6577'], ['L', GREEN], ['A', GREEN], ['N', GREEN], ['K', GOLD]],
    [['K', GREEN], ['L', GREEN], ['A', GREEN], ['N', GREEN], ['G', GREEN]]
  ];
  const size = 46;
  const gap = 8;
  const left = 320 - (5 * size + 4 * gap) / 2 + size / 2;
  const tiles = rows.flatMap((row, r) => row.map(([letter, fill], c) => tile(letter, left + c * (size + gap), 70 + r * (size + gap), size, fill, CREAM))).join('');
  const empty = [0, 1, 2, 3, 4].map((c) => `<rect x="${left + c * (size + gap) - size / 2}" y="${70 + 3 * (size + gap) - size / 2}" width="${size}" height="${size}" rx="${size * 0.2}" fill="none" stroke="${CREAM}" stroke-opacity=".35" stroke-width="2"/>`).join('');
  return frame(`${tiles}${empty}${lilith(486, 150, 112)}${title('Wordle', 'GUESS THE WORD · WORDCIRCLE')}`);
}

// The gallows half drawn, a word half guessed and two letters already tried.
function hangmanSvg(): string {
  const gallows = `<g fill="none" stroke="${CREAM}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M88 240h120M118 240V60h82v26"/><circle cx="200" cy="106" r="20" stroke="${GOLD}"/><path d="M200 126v46M200 140l-22 18M200 140l22 18" stroke="${GOLD}"/></g>`;
  const letters = ['B', '', 'U', 'M'];
  const size = 52;
  const word = letters.map((letter, index) => `${letter ? tile(letter, 300 + index * 64, 130, size) : ''}<rect x="${300 + index * 64 - size / 2}" y="${130 + size / 2 + 8}" width="${size}" height="5" rx="2.5" fill="${CREAM}"/>`).join('');
  const tried = ['E', 'K'].map((letter, index) => tile(letter, 316 + index * 46, 222, 36, '#5b6577', CREAM)).join('');
  return frame(`${gallows}${word}${tried}${lilith(520, 166, 96)}${title('Hangman', 'GUESS THE LETTERS · WORDCIRCLE')}`);
}

// A quiz card with the word and three answers, the right one ticked, and a run of first tries.
function vocabSvg(): string {
  const card = `<g><rect x="168" y="36" width="304" height="96" rx="20" fill="#0e1b2e" opacity=".5" transform="translate(4 5)"/><rect x="168" y="36" width="304" height="96" rx="20" fill="${CREAM}"/><text x="320" y="98" text-anchor="middle" font-family="DM Serif Display" font-size="44" fill="${NAVY}">der Apfel</text></g>`;
  const answers: Array<[string, boolean]> = [['the pear', false], ['the apple', true], ['the plum', false]];
  const choices = answers.map(([text, right], index) => {
    const y = 152 + index * 44;
    return `<rect x="200" y="${y}" width="240" height="34" rx="17" fill="${right ? GREEN : '#2a4466'}" stroke="${right ? '#7fd197' : CREAM}" stroke-opacity="${right ? 1 : 0.25}" stroke-width="2"/><text x="${right ? 300 : 320}" y="${y + 23}" text-anchor="middle" font-family="DM Sans 9pt" font-weight="800" font-size="17" fill="${CREAM}">${text}</text>${right ? `<path d="M392 ${y + 17}l8 8 16-16" fill="none" stroke="${CREAM}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}`;
  }).join('');
  const run = `<g transform="translate(560 70)"><circle r="34" fill="${RED}"/><path d="M0-22c10 12 16 20 16 30a16 16 0 0 1-32 0c0-7 4-12 8-16 0 6 3 9 6 9 0-9-2-15 2-23Z" fill="${GOLD}"/><text y="58" text-anchor="middle" font-family="DM Sans 9pt" font-weight="800" font-size="18" fill="${CREAM}">×12</text></g>`;
  return frame(`${card}${choices}${run}${lilith(36, 120, 104)}${title('Word quiz', 'FIRST TRIES IN A ROW · WORDCIRCLE')}`);
}

async function font(dir: string, path: string, name: string): Promise<string> {
  const ttf = join(dir, name);
  await writeFile(ttf, await decompress(await readFile(join(root, path))));
  return ttf;
}

const outDir = join(root, 'brand');
await mkdir(outDir, { recursive: true });
const thumbDir = join(root, 'static/telegram');
await mkdir(thumbDir, { recursive: true });
const fontDir = await mkdtemp(join(tmpdir(), 'brand-games-fonts-'));
try {
  // The app's own DM Sans subset has no family name in it, so the bold cut comes from @fontsource.
  const fontFiles = [await font(fontDir, 'static/fonts/dm-serif-display-normal-latin.woff2', 'serif.ttf'), await font(fontDir, 'node_modules/@fontsource/dm-sans/files/dm-sans-latin-800-normal.woff2', 'sans.ttf')];
  for (const [id, svg] of [['wordle', wordleSvg()], ['hangman', hangmanSvg()], ['vocab', vocabSvg()]] as const) {
    await writeFile(join(outDir, `game-${id}.svg`), svg);
    await writeFile(join(outDir, `game-${id}.png`), new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'DM Sans 9pt' } }).render().asPng());
    // The whole picture on a navy square: Telegram shows result thumbnails square, and a crop cuts some games apart.
    const thumbnail = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 -140 640 640"><rect x="0" y="-140" width="640" height="640" fill="#101e33"/>${svg}</svg>`;
    await writeFile(join(thumbDir, `game-${id}.png`), new Resvg(thumbnail, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'DM Sans 9pt' } }).render().asPng());
  }
} finally {
  await rm(fontDir, { recursive: true, force: true });
}
console.log('wrote brand/game-wordle, game-hangman, game-vocab (.svg/.png) and static/telegram/game-*.png');
