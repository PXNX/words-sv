// Post-build step: the app ships as a static SPA, so crawlers only ever see the HTML shell.
// For every route in src/lib/seo.js this writes build/<route>/index.html with its own
// title/description/Open Graph tags, and renders a 1200×630 PNG card (built as SVG) to build/og/.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';
import { DEFAULT_SITE_URL, SITE_NAME, imageSlug, pageTitle, pages } from '../src/lib/seo.js';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const buildDir = join(root, 'build');
const icons = require('@iconify-json/material-symbols/icons.json');

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = (process.env.PUBLIC_SITE_URL || (productionHost ? `https://${productionHost}` : DEFAULT_SITE_URL)).replace(/\/+$/, '');

const WIDTH = 1200;
const HEIGHT = 630;
const NAVY = '#172A45';
const AMBER = '#E6A527';
const PAPER = '#FFFDF7';
const RUST = '#A45E38';
const MUTED = '#596477';
// Family names as stored in the font files (the DM Sans cuts are published as "DM Sans 9pt").
const SANS = 'DM Sans 9pt';
const SERIF = 'DM Serif Display';

const escapeXml = (/** @type {string} */ value) =>
	value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Greedy word wrap by character count; good enough for the short, fixed copy in seo.js. */
function wrap(/** @type {string} */ text, /** @type {number} */ maxChars, /** @type {number} */ maxLines) {
	const lines = [''];
	for (const word of text.split(/\s+/)) {
		const current = lines[lines.length - 1];
		if (!current) lines[lines.length - 1] = word;
		else if (current.length + 1 + word.length <= maxChars) lines[lines.length - 1] = `${current} ${word}`;
		else lines.push(word);
	}
	if (lines.length > maxLines) {
		lines.length = maxLines;
		lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.:;–-]+$/, '')}…`;
	}
	return lines;
}

const brandMark = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ size) => `
	<g transform="translate(${x} ${y}) scale(${size / 512})">
		<path d="M256 75a181 181 0 1 0 0 362 181 181 0 1 0 0-362Zm0 56a125 125 0 1 1 0 250 125 125 0 1 1 0-250Z" fill="${NAVY}"/>
		<path d="M317 169a101 101 0 1 0 0 202 101 101 0 1 0 0-202Zm0 40a61 61 0 1 1 0 122 61 61 0 1 1 0-122Z" fill="${AMBER}"/>
		<circle cx="187" cy="256" r="24" fill="${NAVY}"/>
		<circle cx="317" cy="270" r="19" fill="${AMBER}"/>
	</g>`;

function emblem(/** @type {string | null} */ iconName) {
	if (!iconName) return brandMark(720, 95, 440);
	const icon = icons.icons[iconName];
	if (!icon) throw new Error(`Unknown material-symbols icon: ${iconName}`);
	const size = 190;
	const scale = size / (icon.width ?? icons.width ?? 24);
	return `
	<circle cx="965" cy="345" r="160" fill="none" stroke="${AMBER}" stroke-width="16"/>
	<circle cx="905" cy="285" r="150" fill="${NAVY}"/>
	<g transform="translate(${905 - size / 2} ${285 - size / 2}) scale(${scale})">${icon.body.replaceAll('currentColor', PAPER)}</g>`;
}

function cardSvg(/** @type {import('../src/lib/seo.js').PageMeta} */ meta) {
	const titleLines = wrap(meta.title, 14, 2);
	const titleSize = titleLines.length > 1 ? 84 : 104;
	const titleTop = 238;
	const descriptionTop = titleTop + (titleLines.length - 1) * titleSize * 0.98 + 74;
	const kickerTop = titleTop - titleSize * 0.78 - 24;
	const descriptionLines = wrap(meta.description, 38, titleLines.length > 1 ? 2 : 3);
	const grid = Array.from({ length: Math.ceil(WIDTH / 24) }, (_, i) => `M${i * 24} 0V${HEIGHT}`).join('')
		+ Array.from({ length: Math.ceil(HEIGHT / 24) }, (_, i) => `M0 ${i * 24}H${WIDTH}`).join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
	<defs>
		<radialGradient id="glow" cx="50%" cy="15%" r="60%">
			<stop offset="0" stop-color="${AMBER}" stop-opacity=".22"/>
			<stop offset="1" stop-color="${AMBER}" stop-opacity="0"/>
		</radialGradient>
		<clipPath id="paper"><rect x="60" y="56" width="1080" height="508"/></clipPath>
	</defs>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="#EDE4D5"/>
	<path d="${grid}" stroke="${NAVY}" stroke-opacity=".035" stroke-width="1"/>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
	<rect x="74" y="70" width="1080" height="508" fill="${RUST}" fill-opacity=".16"/>
	<rect x="60" y="56" width="1080" height="508" fill="${PAPER}" stroke="${NAVY}" stroke-width="2"/>
	<path d="M60 58H1140M60 65H1140" stroke="${NAVY}" stroke-width="2"/>
	<rect x="72" y="76" width="1056" height="476" fill="none" stroke="${NAVY}" stroke-opacity=".13"/>
	<g clip-path="url(#paper)">${emblem(meta.icon)}</g>
	<text x="120" y="${kickerTop}" font-family="'${SANS}'" font-weight="700" font-size="22" letter-spacing="4" fill="${RUST}">${escapeXml(meta.kicker.toUpperCase())}</text>
	<text font-family="'${SERIF}'" font-size="${titleSize}" letter-spacing="-2" fill="${NAVY}">${titleLines
		.map((line, i) => `<tspan x="114" y="${titleTop + i * titleSize * 0.98}">${escapeXml(line)}</tspan>`)
		.join('')}</text>
	<text font-family="'${SANS}'" font-size="28" fill="${MUTED}">${descriptionLines
		.map((line, i) => `<tspan x="120" y="${descriptionTop + i * 42}">${escapeXml(line)}</tspan>`)
		.join('')}</text>
	${brandMark(108, 470, 64)}
	<text x="178" y="512" font-family="'${SERIF}'" font-size="30" fill="${NAVY}">${SITE_NAME}</text>
	<text x="356" y="511" font-family="'${SANS}'" font-size="20" fill="${MUTED}">${escapeXml(new URL(siteUrl).host)}</text>
</svg>`;
}

// resvg only loads fonts from disk and cannot read woff2, so the fonts are unpacked to a temp dir.
// The app ships DM Sans as a variable font, which resvg cannot instance, hence the static
// weights from @fontsource. The latin subsets cover all characters used in seo.js.
async function loadFonts(/** @type {string} */ dir) {
	const files = [
		require.resolve('@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2'),
		require.resolve('@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2'),
		join(root, 'static/fonts/dm-serif-display-normal-latin.woff2')
	];
	// Sequential on purpose: concurrent wawoff2 decompress calls corrupt each other's output.
	const ttfs = [];
	for (const [i, file] of files.entries()) {
		const ttf = join(dir, `${i}.ttf`);
		await writeFile(ttf, await decompress(await readFile(file)));
		ttfs.push(ttf);
	}
	return ttfs;
}

function headTags(/** @type {string} */ path, /** @type {import('../src/lib/seo.js').PageMeta} */ meta) {
	const url = `${siteUrl}${path === '/' ? '/' : path}`;
	const image = `${siteUrl}/og/${imageSlug(path)}.png`;
	const title = escapeXml(pageTitle(path));
	const description = escapeXml(meta.description);
	return [
		`<title>${title}</title>`,
		`<meta name="description" content="${description}" />`,
		`<link rel="canonical" href="${url}" />`,
		`<meta property="og:type" content="website" />`,
		`<meta property="og:site_name" content="${SITE_NAME}" />`,
		`<meta property="og:locale" content="de_DE" />`,
		`<meta property="og:url" content="${url}" />`,
		`<meta property="og:title" content="${title}" />`,
		`<meta property="og:description" content="${description}" />`,
		`<meta property="og:image" content="${image}" />`,
		`<meta property="og:image:type" content="image/png" />`,
		`<meta property="og:image:width" content="${WIDTH}" />`,
		`<meta property="og:image:height" content="${HEIGHT}" />`,
		`<meta property="og:image:alt" content="${title}" />`,
		`<meta name="twitter:card" content="summary_large_image" />`,
		`<meta name="twitter:title" content="${title}" />`,
		`<meta name="twitter:description" content="${description}" />`,
		`<meta name="twitter:image" content="${image}" />`
	].join('\n\t\t');
}

// Tags from a previous run are stripped so the script can be re-run against the same build.
const injected = /\s*<!-- og:start -->[\s\S]*?<!-- og:end -->/;
const descriptionTag = /\s*<meta\s+name="description"[\s\S]*?\/?>/;
const template = (await readFile(join(buildDir, 'index.html'), 'utf8')).replace(injected, '').replace(descriptionTag, '');
if (!template.includes('</head>')) throw new Error('build/index.html has no </head>');

const fontDir = await mkdtemp(join(tmpdir(), 'og-fonts-'));
const fontFiles = await loadFonts(fontDir);
await mkdir(join(buildDir, 'og'), { recursive: true });

for (const [path, meta] of Object.entries(pages)) {
	const html = template.replace('</head>', `\t<!-- og:start -->\n\t\t${headTags(path, meta)}\n\t\t<!-- og:end -->\n\t</head>`);
	const htmlFile = path === '/' ? join(buildDir, 'index.html') : join(buildDir, path.slice(1), 'index.html');
	await mkdir(dirname(htmlFile), { recursive: true });
	await writeFile(htmlFile, html);

	if (meta.image) continue;
	const png = new Resvg(cardSvg(meta), {
		fitTo: { mode: 'width', value: WIDTH },
		font: { fontFiles, loadSystemFonts: false, defaultFontFamily: SANS }, logLevel: 'warn'
	}).render().asPng();
	await writeFile(join(buildDir, 'og', `${imageSlug(path)}.png`), png);
}

await rm(fontDir, { recursive: true, force: true });
console.log(`og: wrote head tags for ${Object.keys(pages).length} routes (${siteUrl})`);
