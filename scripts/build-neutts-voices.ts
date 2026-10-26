#!/usr/bin/env bun
/*
 * Generates NeuTTS voice references for the story cast, one per character, and writes them
 * to `static/voices/neutts-voices.json`. Run it with `bun scripts/build-neutts-voices.ts`
 * after installing the model (see `bun scripts/install-neutts.ts`).
 *
 * Each character gets a natural-language description that NeuTTS turns into a voice, plus the
 * reference text that is spoken to encode it. The resulting voice codes are small enough to
 * ship with the app, so the browser never has to clone a voice at runtime.
 *
 *   bun run neutts:install   # downloads the GGUF model once
 *   bun run neutts:build      # generates and encodes every character's voice
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(import.meta.dirname, '..', 'static', 'voices');
const OUT_FILE = join(OUT_DIR, 'neutts-voices.json');

// The story cast, in the order they appear. Each entry is the voice description NeuTTS uses
// to design the voice, plus the reference sentence that is spoken to encode it.
const CAST = [
  { id: 'narrator', description: 'a calm, clear German narrator, moderate pace, neutral tone', text: 'Willkommen bei den Geschichten. Ich lese dir die Wörter vor, so dass du sie hören und wiederholen kannst.' },
  { id: 'oma', description: 'a warm, slightly raspy older woman, gentle and patient', text: 'Komm, mein Lieber, setz dich nieder. Wir together die Wörter an.' },
  { id: 'mia', description: 'a bright, curious young girl, lively and expressive', text: 'Oma, was ist das denn für ein Wort? Ich möchte es ganz genau hören.' },
  { id: 'jana', description: 'a cool, confident teenage girl, relaxed and clear', text: 'Ja, das kenne ich schon. Lass uns das nächste Wort machen, ich bin bereit.' },
  { id: 'kim', description: 'a hyperactive, very high-pitched young girl, fast and bubbly', text: 'Wow, das ist aber schnell! Ich will das Wort wiederholen, gleich, gleich!' },
  { id: 'tom', description: 'a steady, friendly young man, clear and moderate', text: 'Ich habe das Wort verstanden. Soll ich es noch einmal sagen?' },
  { id: 'paul', description: 'a deep, warm man, slow and deliberate', text: 'Ja, das Wort ist richtig. Wiederhole es bitte, damit du es gut einprägst.' },
  { id: 'becker', description: 'a gruff, no-nonsense middle-aged man, firm and direct', text: 'Hör auf zu fragen. Das Wort ist das Wort, sag es einfach nach.' },
  { id: 'leo', description: 'a light, quick young man, energetic', text: 'Ich bin bereit! Das nächste Wort, bitte, ich bin hungrig auf neue Wörter.' },
  { id: 'tobias', description: 'a thoughtful, slightly hesitant man, careful pronunciation', text: 'Hmm, das Wort... ich sage es noch einmal, langsam und klar.' },
  { id: 'robert', description: 'a warm, reassuring older man, gentle', text: 'Mach dir keine Sorgen. Das Wort ist nicht so schwer, wie es aussieht.' },
  { id: 'simon', description: 'a bright, eager young man, fast and clear', text: 'Ich habe es verstanden! Das war ja gar nicht so schwierig.' },
  { id: 'kumar', description: 'a calm, measured man with a slight accent, deliberate', text: 'Das Wort ist richtig ausgesprochen. Wiederhole es bitte.' },
  { id: 'selma', description: 'a warm, patient older woman, gentle and clear', text: 'Gut, mein Kind. Das Wort ist korrekt. Wir machen nun das nächste.' },
  { id: 'sabine', description: 'a confident, clear middle-aged woman, firm and articulate', text: 'Das Wort ist ausgesprochen. Höre es noch einmal und wiederhole es.' },
  { id: 'lilith', description: 'a mysterious, low-pitched woman, slow and deliberate', text: 'Das Wort... es ist alt. Sprich es, damit es nicht in Vergessenheit gerät.' }
];

async function main() {
  const { NeuTTSAir } = await import('neuttsair');
  const tts = new NeuTTSAir({
    backbone_repo: 'neuphonic/neutts-air',
    backbone_device: 'cpu',
    codec_repo: 'neuphonic/neucodec',
    codec_device: 'cpu'
  });

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const voices: Record<string, { description: string; text: string; codes: number[] }> = {};
  for (const { id, description, text } of CAST) {
    process.stdout.write(`encoding ${id}...`);
    const codes = tts.encodeReferenceFromText(text, description);
    voices[id] = { description, text, codes: [...codes] };
    process.stdout.write(` ${codes.length} codes\n`);
  }

  writeFileSync(OUT_FILE, JSON.stringify(voices, null, 2));
  console.log(`wrote ${OUT_FILE} (${Object.keys(voices).length} voices)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});