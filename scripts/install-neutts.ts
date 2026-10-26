#!/usr/bin/env bun
/*
 * Downloads the NeuTTS Air Q4 GGUF model once so `scripts/build-neutts-voices.ts` can run.
 * The model is about 300 MB and is cached in `~/.cache/neutts` after this.
 */
import { existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import https from 'node:https';
import { createGunzip } from 'node:zlib';

const REPO = 'neuphonic/neutts-air';
const FILE = 'neutts-air-q4.gguf';
const home = process.env.HOME ?? process.env.USERPROFILE ?? process.env.USERPROFILE;
const destDir = join(home, '.cache', 'neutts');
const dest = join(destDir, FILE);

if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
if (existsSync(dest)) {
  console.log(`already present: ${dest}`);
  process.exit(0);
}

const url = `https://huggingface.co/${REPO}/resolve/main/${FILE}`;
console.log(`downloading ${url} → ${dest}`);

function get(url: string): Promise<https.Response> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(get(res.headers.location));
      } else if (res.statusCode !== 200) {
        reject(new Error(`${url}: ${res.statusCode}`));
      } else {
        resolve(res);
      }
    }).on('error', reject);
  });
}

await pipeline(await get(url), createGunzip(), createWriteStream(dest));
console.log(`done: ${dest}`);