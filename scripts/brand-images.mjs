// Mia, Tom and Lilith as on the home page, outside the app:
// - static/icons/wordcircle-trio-512.svg: a 512x512 picture for loading screens (transparent).
// - static/icons/wordcircle-splash-512.svg/.png: the same on the splash background, kept inside the
//   centre circle (2/3 of the width) that Android 12 splash screens and maskable icons never crop.
// - build/brand/telegram-description.png: the 640x360 picture BotFather shows above the bot's
//   description (/setdescriptionpic); the Bot API has no method for it.
//
// The characters are StoryCharacter's rendered markup in its resting pose (captured from the home
// page); rerun after changing their look. Usage: node scripts/brand-images.mjs
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const MIA = `<circle cx="60" cy="54" r="33" fill="#c4522e"/><circle cx="60" cy="19" r="13" fill="#c4522e"/><path d="M14 150c0-30 20-48 46-48s46 18 46 48Z" stroke="rgba(23,42,69,.18)" stroke-width="1.5" fill="#e6a527"/><path d="M47 104q13 12 26 0" fill="none" stroke="#fffdf7" stroke-width="3" stroke-linecap="round"/><rect y="82" height="22" rx="6" x="51" width="18" fill="#f2c7a5"/><circle cy="60" r="6" cx="30" fill="#f2c7a5"/><circle cy="60" r="6" cx="90" fill="#f2c7a5"/><ellipse cx="60" cy="58" rx="30" ry="30" fill="#f2c7a5"/><path d="M28 58c0-24 15-34 32-34s32 10 32 34c-7-12-20-18-34-17-13 1-24 7-30 17Z" fill="#c4522e"/><g fill="#f19a8a" opacity="0.38"><circle cx="43" cy="70" r="4.5"/><circle cx="77" cy="70" r="4.5"/></g><g fill="#172a45"><circle cx="49" cy="60" r="3.3"/><circle cx="71" cy="60" r="3.3"/></g><path fill="none" stroke-width="2.8" stroke-linecap="round" d="M44 51q5-3 10 0M66 51q5-3 10 0" stroke="#c4522e"/><path d="M60 62q-3 5 0 7" fill="none" stroke="rgba(23,42,69,.4)" stroke-width="1.8" stroke-linecap="round"/><path fill="none" stroke="#7a2e2a" stroke-width="2.4" stroke-linecap="round" d="M52 76q8 6 16 0"/>`;

const TOM = `<path d="M14 150c0-30 20-48 46-48s46 18 46 48Z" stroke="rgba(23,42,69,.18)" stroke-width="1.5" fill="#fffdf7"/><path d="M38 150v-34h44v34Z" fill="#34824d"/><path d="M42 116 50 103M78 116l-8-13" stroke-width="3.5" stroke="#34824d"/><rect x="52" y="124" width="16" height="10" rx="2" fill="rgba(255,253,247,.3)"/><rect y="82" height="22" rx="6" x="51" width="18" fill="#8d5a3b"/><circle cy="60" r="6" cx="30" fill="#8d5a3b"/><circle cy="60" r="6" cx="90" fill="#8d5a3b"/><ellipse cx="60" cy="58" rx="30" ry="30" fill="#8d5a3b"/><g fill="#1f1a17"><circle cx="37" cy="44" r="10"/><circle cx="46" cy="33" r="11"/><circle cx="60" cy="29" r="12"/><circle cx="74" cy="33" r="11"/><circle cx="83" cy="44" r="10"/></g><g fill="#f19a8a" opacity="0.38"><circle cx="43" cy="70" r="4.5"/><circle cx="77" cy="70" r="4.5"/></g><g fill="#172a45"><circle cx="49" cy="60" r="3.3"/><circle cx="71" cy="60" r="3.3"/></g><path fill="none" stroke-width="2.8" stroke-linecap="round" d="M44 51q5-3 10 0M66 51q5-3 10 0" stroke="#1f1a17"/><path d="M60 62q-3 5 0 7" fill="none" stroke="rgba(23,42,69,.4)" stroke-width="1.8" stroke-linecap="round"/><path fill="none" stroke="#7a2e2a" stroke-width="2.4" stroke-linecap="round" d="M52 76q8 6 16 0"/>`;

const LILITH = `<defs><radialGradient cx=".5" cy=".2" r=".85" id="lilith-coat"><stop offset="0" stop-color="#f8f0e4"/><stop offset=".45" stop-color="#ead9c2"/><stop offset=".8" stop-color="#c3a585"/><stop offset="1" stop-color="#8a6a52"/></radialGradient><radialGradient cx=".5" cy=".3" r=".7" id="lilith-head"><stop offset="0" stop-color="#f7eee1"/><stop offset="1" stop-color="#dcc6aa"/></radialGradient><radialGradient cx=".5" cy=".58" r=".5" id="lilith-mask"><stop offset="0" stop-color="#2b1d15"/><stop offset=".45" stop-color="#46301f" stop-opacity=".9"/><stop offset=".78" stop-color="#7a5b45" stop-opacity=".4"/><stop offset="1" stop-color="#a08066" stop-opacity="0"/></radialGradient><linearGradient x1="0" y1="0" x2="0" y2="1" id="lilith-leg"><stop offset="0" stop-color="#dcc5a9"/><stop offset=".45" stop-color="#a7866b"/><stop offset="1" stop-color="#4a3326"/></linearGradient><linearGradient x1="0" y1="0" x2="1" y2="0" id="lilith-tail"><stop offset="0" stop-color="#36251b"/><stop offset="1" stop-color="#8d6d55"/></linearGradient><linearGradient x1="0" y1="0" x2="0" y2="1" id="lilith-ear"><stop offset="0" stop-color="#3a281e"/><stop offset="1" stop-color="#6e5140"/></linearGradient><radialGradient cx=".45" cy=".4" r=".6" id="lilith-eye"><stop offset="0" stop-color="#d9f0fb"/><stop offset=".5" stop-color="#7cc0ea"/><stop offset="1" stop-color="#2c6aa3"/></radialGradient></defs><path d="M60 76c20 0 36 14 39 34l4 3-3 3c1 12-2 23-8 31H28c-6-8-9-19-8-31l-3-3 4-3c3-20 19-34 39-34Z" fill="url(#lilith-coat)"/><path d="M46 116c-2 10-2 21-1 30h13c0-9 0-19-1-30Z" fill="url(#lilith-leg)"/><path d="M74 116c2 10 2 21 1 30H62c0-9 0-19-1-30Z" fill="url(#lilith-leg)"/><g fill="#f8efe3" opacity=".85"><ellipse cx="60" cy="94" rx="20" ry="13"/><circle cx="46" cy="101" r="7.5"/><circle cx="74" cy="101" r="7.5"/><circle cx="52" cy="108" r="7"/><circle cx="68" cy="108" r="7"/><circle cx="60" cy="112" r="6.5"/></g><g fill="#3e2b20"><ellipse cx="51" cy="145.5" rx="8" ry="4.5"/><ellipse cx="69" cy="145.5" rx="8" ry="4.5"/></g><path d="M93 146c-15 7-60 8-78 0-9-4-8-16 2-15 4 1 6 4 10 5 18 5 43 5 63 2 6 0 8 6 3 8Z" fill="url(#lilith-tail)"/><g transform="rotate(-7 60 64) translate(60 66) scale(.86) translate(-60 -62)"><path d="M29 50Q24 30 28 15q14 7 27 18Z" fill="url(#lilith-ear)"/><path d="M33 44q-3-13-1-22 9 5 16 12Z" fill="#7a5646"/><path d="M35 42l4-6M38 44l5-5" stroke="#f4e9da" stroke-width="1" opacity=".8"/><path d="M91 50Q96 30 92 15q-14 7-27 18Z" fill="url(#lilith-ear)"/><path d="M87 44q3-13 1-22-9 5-16 12Z" fill="#7a5646"/><path d="M85 42l-4-6M82 44l-5-5" stroke="#f4e9da" stroke-width="1" opacity=".8"/><path d="M60 30c20 0 32 12 33 28l5 4-5 4 3 6-7 2c-5 12-17 18-29 18s-24-6-29-18l-7-2 3-6-5-4 5-4c1-16 13-28 33-28Z" fill="url(#lilith-head)"/><ellipse cx="60" cy="42" rx="12" ry="6" fill="#cdb497" opacity=".45"/><ellipse cx="60" cy="68" rx="26" ry="22" fill="url(#lilith-mask)"/><g fill="#2e1f17" opacity=".4"><circle cx="47.5" cy="64" r="10"/><circle cx="72.5" cy="64" r="10"/></g><circle cx="47.5" cy="64" r="7.6" stroke="#140d0a" stroke-width="1.4" fill="url(#lilith-eye)"/><circle cx="72.5" cy="64" r="7.6" stroke="#140d0a" stroke-width="1.4" fill="url(#lilith-eye)"/><circle fill="#0d0907" cx="47.5" cy="64.3" r="5.4"/><circle fill="#0d0907" cx="72.5" cy="64.3" r="5.4"/><circle cx="49.8" cy="61.5" r="1.8" fill="#fff"/><circle cx="74.8" cy="61.5" r="1.8" fill="#fff"/><circle cx="45.6" cy="66.6" r=".8" fill="#fff"/><circle cx="70.6" cy="66.6" r=".8" fill="#fff"/><path d="M55.5 74.5h9L60 79.5Z" fill="#22160f"/><ellipse cx="60" cy="83" rx="2.2" ry="2.6" fill="#c86f7f"/><path d="M44 78 18 73M44 81l-26 2M76 78l26-5M76 81l26 2" stroke="rgba(255,250,240,.85)" stroke-width="1" stroke-linecap="round"/></g>`;

// The home page's .home-family in CSS pixels: the arch (140.8 x 99.2, 2px border, 51.2px top radius)
// with Mia and Tom (64 x 86.4 each, overlapping by 14.4), Lilith (70.4 x 88) overlapping its right
// edge by 21.6, and the 2px ground line reaching 9.6 past both sides.
const FAMILY = { left: -9.6, width: 208.8, height: 99.2 };
const character = (body, x, y, width, height) => `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 120 150">${body}</svg>`;
const ARCH = 'M1 99.2V52.2A51.2 51.2 0 0 1 52.2 1H88.6A51.2 51.2 0 0 1 139.8 52.2V99.2';

function family() {
  return `<defs><radialGradient id="arch-glow" cx=".5" cy=".85" r=".7"><stop offset="0" stop-color="#f7e2b0"/><stop offset="1" stop-color="#fbf1da"/></radialGradient><clipPath id="arch-clip"><path d="${ARCH}Z"/></clipPath></defs>
<path d="${ARCH}Z" fill="url(#arch-glow)"/>
<g clip-path="url(#arch-clip)">${character(MIA, 10.8, 12.8, 64, 86.4)}${character(TOM, 60.4, 12.8, 64, 86.4)}</g>
<path d="${ARCH}" fill="none" stroke="#172a45" stroke-width="2"/>
${character(LILITH, 119.2, 11.2, 70.4, 88)}
<rect x="${FAMILY.left}" y="97.2" width="${FAMILY.width}" height="2" rx="1" fill="#172a45"/>`;
}

function place(width, top, canvasWidth) {
  const scale = width / FAMILY.width;
  return `transform="translate(${(canvasWidth - width) / 2 - FAMILY.left * scale} ${top}) scale(${scale})"`;
}

function iconSvg() {
  const width = 448;
  const top = (512 - FAMILY.height * (width / FAMILY.width)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Mia, Tom und Lilith">
<g ${place(width, top, 512)}>${family()}</g>
</svg>
`;
}

function splashSvg() {
  // The trio's corners stay within a circle of radius 512/3: half-width * hypot(1, height/width) <= 170.
  const width = 300;
  const top = (512 - FAMILY.height * (width / FAMILY.width)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="WordCircle">
<rect width="512" height="512" fill="#fffdf7"/>
<g ${place(width, top, 512)}>${family()}</g>
</svg>
`;
}

function telegramSvg() {
  const width = 420;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
<defs><radialGradient id="paper-glow" cx=".5" cy=".38" r=".5"><stop offset="0" stop-color="#e6a527" stop-opacity=".3"/><stop offset="1" stop-color="#e6a527" stop-opacity="0"/></radialGradient><pattern id="paper-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#172a45" stroke-opacity=".05" stroke-width="1"/></pattern></defs>
<rect width="640" height="360" fill="#ede4d5"/><rect width="640" height="360" fill="url(#paper-grid)"/><rect width="640" height="360" fill="url(#paper-glow)"/>
<g ${place(width, 34, 640)}>${family()}</g>
<text x="320" y="318" text-anchor="middle" font-family="DM Serif Display" font-size="60" letter-spacing="-2.4" fill="#172a45">WordCircle</text>
</svg>`;
}

async function serifFont(dir) {
  const ttf = join(dir, 'serif.ttf');
  await writeFile(ttf, await decompress(await readFile(join(root, 'static/fonts/dm-serif-display-normal-latin.woff2'))));
  return ttf;
}

await writeFile(join(root, 'static/icons/wordcircle-trio-512.svg'), iconSvg());
await writeFile(join(root, 'static/icons/wordcircle-splash-512.svg'), splashSvg());
await writeFile(join(root, 'static/icons/wordcircle-splash-512.png'), new Resvg(splashSvg()).render().asPng());
const outDir = join(root, 'build/brand');
await mkdir(outDir, { recursive: true });
const fontDir = await mkdtemp(join(tmpdir(), 'brand-fonts-'));
try {
  const png = new Resvg(telegramSvg(), { font: { fontFiles: [await serifFont(fontDir)], loadSystemFonts: false, defaultFontFamily: 'DM Serif Display' } }).render().asPng();
  await writeFile(join(outDir, 'telegram-description.png'), png);
  // A preview of the icon, to check it without a browser.
  await writeFile(join(outDir, 'wordcircle-trio-512.png'), new Resvg(iconSvg()).render().asPng());
} finally {
  await rm(fontDir, { recursive: true, force: true });
}
console.log('wrote static/icons/wordcircle-{trio,splash}-512.* and build/brand/telegram-description.png');
