#!/usr/bin/env bun
/*
 * Generates character voice recordings using Microsoft Edge TTS (free, no API key).
 * Each character gets a reference sentence spoken in a voice that suits them.
 * The MP3s are committed to the repo and played back from raw.githubusercontent.com when
 * the "NeuTTS" model is selected in settings.
 *
 *   bun run voices:build
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(import.meta.dirname, '..', 'static', 'voices', 'characters');
const OUT_FILE = join(import.meta.dirname, '..', 'static', 'voices', 'characters.json');

const CAST = [
  { id: 'narrator', voice: 'de-DE-KatjaNeural', rate: 0.9, text: 'Willkommen bei den Geschichten. Ich lese dir die Wörter vor, so dass du sie hören und wiederholen kannst.' },
  { id: 'oma', voice: 'de-DE-KatjaNeural', rate: 0.85, text: 'Komm, mein Lieber, setz dich nieder. Wir zusammen die Wörter an.' },
  { id: 'mia', voice: 'de-DE-KatjaNeural', rate: 1.15, text: 'Oma, was ist das denn für ein Wort? Ich möchte es ganz genau hören.' },
  { id: 'jana', voice: 'de-DE-KatjaNeural', rate: 1.05, text: 'Ja, das kenne ich schon. Lass uns das nächste Wort machen, ich bin bereit.' },
  { id: 'kim', voice: 'de-DE-KatjaNeural', rate: 1.25, text: 'Wow, das ist aber schnell! Ich will das Wort wiederholen, gleich, gleich!' },
  { id: 'tom', voice: 'de-DE-ConradNeural', rate: 1.0, text: 'Ich habe das Wort verstanden. Soll ich es noch einmal sagen?' },
  { id: 'paul', voice: 'de-DE-ConradNeural', rate: 0.8, text: 'Ja, das Wort ist richtig. Wiederhole es bitte, damit du es gut einprägst.' },
  { id: 'becker', voice: 'de-DE-ConradNeural', rate: 0.9, text: 'Hör auf zu fragen. Das Wort ist das Wort, sag es einfach nach.' },
  { id: 'leo', voice: 'de-DE-ConradNeural', rate: 1.15, text: 'Ich bin bereit! Das nächste Wort, bitte, ich bin hungrig auf neue Wörter.' },
  { id: 'tobias', voice: 'de-DE-ConradNeural', rate: 0.95, text: 'Hmm, das Wort... ich sage es noch einmal, langsam und klar.' },
  { id: 'robert', voice: 'de-DE-ConradNeural', rate: 0.88, text: 'Mach dir keine Sorgen. Das Wort ist nicht so schwer, wie es aussieht.' },
  { id: 'simon', voice: 'de-DE-ConradNeural', rate: 1.1, text: 'Ich habe es verstanden! Das war ja gar nicht so schwierig.' },
  { id: 'kumar', voice: 'de-DE-ConradNeural', rate: 0.92, text: 'Das Wort ist richtig ausgesprochen. Wiederhole es bitte.' },
  { id: 'selma', voice: 'de-DE-KatjaNeural', rate: 0.87, text: 'Gut, mein Kind. Das Wort ist korrekt. Wir machen nun das nächste.' },
  { id: 'sabine', voice: 'de-DE-KatjaNeural', rate: 1.0, text: 'Das Wort ist ausgesprochen. Höre es noch einmal und wiederhole es.' },
  { id: 'lilith', voice: 'de-DE-KatjaNeural', rate: 0.78, text: 'Das Wort... es ist alt. Sprich es, damit es nicht in Vergessenheit gerät.' }
];

function uuid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ssml(text: string, voice: string, rate: number) {
  const ratePct = Math.round((rate - 1) * 100);
  return `<?xml version="1.0" encoding="UTF-8"?><speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE"><voice name="${voice}"><prosody rate="${ratePct >= 0 ? '+' : ''}${ratePct}%">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody></voice></speak>`;
}

async function synthesize(text: string, voice: string, rate: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://speech.platform.bing.com/speech/synthesize/context');
    const chunks: Buffer[] = [];
    let settled = false;
    const timer = setTimeout(() => finish(new Error('timed out')), 30000);

    function finish(error: Error | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (error) return reject(error);
      resolve(Buffer.concat(chunks));
    }

    ws.onopen = () => {
      const config = 'Content-Type:application/json; charset=utf-8\r\n\r\n';
      const ssmlText = ssml(text, voice, rate);
      const request = `X-Timestamp:${new Date().toUTCString()}\r\nX-RequestId:${uuid()}\r\nPath:synthesize\r\n\r\n`;
      ws.send(config + request + ssmlText);
    };

    ws.onmessage = (event: MessageEvent) => {
      const data = Buffer.from(event.data);
      if (data.length > 0 && data[0] !== 0x49) chunks.push(data); // skip JSON metadata frames
    };

    ws.onclose = () => finish(null);
    ws.onerror = (err) => finish(err instanceof Error ? err : new Error(String(err)));
  });
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const voices: Record<string, { voice: string; rate: number; text: string; file: string }> = {};
  for (const { id, voice, rate, text } of CAST) {
    process.stdout.write(`synthesizing ${id} (${voice}, rate=${rate})...`);
    const mp3 = await synthesize(text, voice, rate);
    const file = `${id}.mp3`;
    writeFileSync(join(OUT_DIR, file), mp3);
    voices[id] = { voice, rate, text, file };
    process.stdout.write(` ${mp3.length} bytes\n`);
  }

  writeFileSync(OUT_FILE, JSON.stringify(voices, null, 2));
  console.log(`wrote ${OUT_FILE} (${Object.keys(voices).length} voices)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});