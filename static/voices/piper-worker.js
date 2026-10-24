/*
 * Natural story voices: runs Piper neural text-to-speech (https://github.com/rhasspy/piper) on the
 * learner's device, off the main thread. espeak-ng (compiled to WebAssembly) turns a sentence into
 * phonemes, and the voice model (ONNX, run by onnxruntime-web) turns those into audio.
 *
 * The runtimes come from jsDelivr and the voice models from Hugging Face. Models are kept in the
 * `story-voices-v1` cache, so each one is downloaded only once and then works offline.
 *
 * Messages in:  { id, type: 'load', model }                  → { id, type: 'progress', loaded, total }…, { id, type: 'done' }
 *               { id, type: 'speak', model, text, speaker, lengthScale } → { id, type: 'done', pcm, sampleRate }
 * Any failure answers { id, type: 'error', message }.
 */
const ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
const PHONEMIZE_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
const MODEL_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/';
const CACHE = 'story-voices-v1';

importScripts(`${ORT_BASE}ort.wasm.min.js`, `${PHONEMIZE_BASE}.js`);
/* global ort, createPiperPhonemize */
ort.env.wasm.wasmPaths = ORT_BASE;
// Several threads need a cross-origin isolated page; one thread is fast enough for a sentence at a time.
ort.env.wasm.numThreads = 1;

// Fetches a file through the cache, reporting download progress for large ones.
async function cachedFetch(url, onProgress) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url);
  if (hit) return hit.arrayBuffer();
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`${url}: ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  const buffer = await new Blob(chunks).arrayBuffer();
  await cache.put(url, new Response(buffer.slice(0), { headers: { 'content-type': 'application/octet-stream' } }));
  return buffer;
}

let phonemizer = null;
function phonemizerFiles() {
  phonemizer ??= Promise.all([cachedFetch(`${PHONEMIZE_BASE}.wasm`), cachedFetch(`${PHONEMIZE_BASE}.data`)]).catch((error) => {
    phonemizer = null;
    throw error;
  });
  return phonemizer;
}

// One espeak-ng module serves many sentences: a fresh module per sentence (18 MB of language data
// each) piles up until the worker stalls after a hundred or so sentences, while a single module
// leaks a little with every run and aborts after about 150. So a module is replaced every
// RECYCLE_AFTER sentences, and right away if it fails.
const RECYCLE_AFTER = 40;
let phonemizeModule = null;
let phonemizeRuns = 0;
let onPrint = null;
function phonemizeRuntime() {
  if (phonemizeRuns >= RECYCLE_AFTER) {
    phonemizeModule = null;
    phonemizeRuns = 0;
  }
  phonemizeRuns += 1;
  phonemizeModule ??= phonemizerFiles().then(([wasm, data]) => createPiperPhonemize({
    wasmBinary: wasm,
    getPreloadedPackage: () => data,
    print: (line) => onPrint?.(line),
    printErr: () => {}
  }));
  phonemizeModule.catch(() => (phonemizeModule = null));
  return phonemizeModule;
}

async function phonemeSymbols(text, voice, retry = true) {
  try {
    return await phonemizeOnce(text, voice);
  } catch (error) {
    phonemizeModule = null;
    phonemizeRuns = 0;
    if (retry) return phonemeSymbols(text, voice, false);
    throw error;
  }
}

async function phonemizeOnce(text, voice) {
  const module = await phonemizeRuntime();
  return new Promise((resolve, reject) => {
    onPrint = (line) => {
      try {
        resolve(JSON.parse(line).phonemes);
      } catch (error) {
        reject(error);
      }
    };
    try {
      module.callMain(['-l', voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
    } catch (error) {
      reject(error);
    }
    // The program prints its answer while it runs; no answer means it failed.
    reject(new Error('no phonemes'));
  });
}

// espeak hands back one symbol per code point: "ç" arrives as "c" plus a combining cedilla.
// Voice models do not all use the same spelling, so try the composed symbol first, then the
// decomposed one, then its parts against the model's own phoneme map. This keeps older German
// voices (which only know the composed "ç") and newer ones (which know the combining mark) working.
function idsFor(symbols, idMap) {
  const merged = [];
  for (const symbol of symbols) {
    if (/^\p{M}/u.test(symbol) && merged.length) merged[merged.length - 1] += symbol;
    else merged.push(symbol);
  }
  const ids = [1];
  for (const symbol of merged) {
    const composed = symbol.normalize('NFC');
    let mapped = idMap[composed] ?? idMap[symbol];
    if (!mapped) {
      const parts = [...symbol];
      if (parts.length > 1 && parts.every((part) => idMap[part])) mapped = parts.flatMap((part) => idMap[part]);
    }
    if (!mapped) continue;
    ids.push(0, ...mapped);
  }
  ids.push(0, 2);
  return ids;
}

const models = new Map();
function loadModel(model, onProgress) {
  if (!models.has(model)) {
    const loading = (async () => {
      const config = JSON.parse(new TextDecoder().decode(await cachedFetch(`${MODEL_BASE}${model}.json`)));
      await phonemizerFiles();
      const weights = await cachedFetch(`${MODEL_BASE}${model}`, onProgress);
      const session = await ort.InferenceSession.create(weights, { executionProviders: ['wasm'] });
      return { config, session };
    })();
    loading.catch(() => models.delete(model));
    models.set(model, loading);
  }
  return models.get(model);
}

async function speak({ model, text, speaker, lengthScale, noiseScale, noiseW }) {
  const { config, session } = await loadModel(model);
  const ids = idsFor(await phonemeSymbols(text, config.espeak.voice), config.phoneme_id_map);
  const { noise_scale: defaultNoise, length_scale: baseLength, noise_w: defaultNoiseW } = config.inference;
  // Piper draws a little duration jitter per sentence; too much of it makes one sentence race and
  // the next drag. Keep the rhythm steady so the message keeps one pace from start to end.
  const steadyNoiseW = Math.min(noiseW ?? defaultNoiseW, 0.6);
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)])),
    scales: new ort.Tensor('float32', Float32Array.from([noiseScale ?? defaultNoise, baseLength * lengthScale, steadyNoiseW]))
  };
  if (config.num_speakers > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(speaker ?? 0)]));
  const { output } = await session.run(feeds);
  return { pcm: new Float32Array(output.data), sampleRate: config.audio.sample_rate };
}

// One request at a time: the model and the phonemizer are not built for running in parallel.
let queue = Promise.resolve();
self.addEventListener('message', ({ data }) => {
  const { id, type } = data;
  queue = queue.then(async () => {
    try {
      if (type === 'load') {
        await loadModel(data.model, (loaded, total) => self.postMessage({ id, type: 'progress', loaded, total }));
        self.postMessage({ id, type: 'done' });
      } else if (type === 'speak') {
        const { pcm, sampleRate } = await speak(data);
        self.postMessage({ id, type: 'done', pcm, sampleRate }, [pcm.buffer]);
      }
    } catch (error) {
      self.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  });
});
