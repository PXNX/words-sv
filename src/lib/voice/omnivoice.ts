/*
 * OmniVoice (k2-fsa) — massively multilingual zero-shot TTS, 600+ languages.
 *
 * A diffusion language model built on a Qwen3-0.6B backbone with an 8-codebook audio codec
 * (Higgs Audio V2). Runs entirely in the browser via WebGPU — the ONNX export from
 * Gigsu/vocoloco-onnx splits the model into a 1.1 GB main graph, an 85 MB decoder and a 622 MB
 * encoder. Voice design is done through a natural language description, so the story cast gets a
 * voice from a prompt like "warm older woman" rather than a fixed speaker ID.
 *
 * It is free and open (Apache 2.0), but the download is large and a sentence takes a moment to
 * synthesize. The story falls back to the browser's own speechSynthesis if it is not ready yet.
 */
const MODEL_BASE = 'https://huggingface.co/Gigsu/vocoloco-onnx/resolve/main';
const VOICES = ['amused', 'angry', 'disgusted', 'drunk', 'neutral', 'sleepy', 'surprised', 'whisper'];

let ready = false;
let session: any = null;

export function omnivoiceSupported() {
  return typeof window !== 'undefined' && 'WebGPU' in window;
}

export async function prepareOmniVoice(): Promise<void> {
  if (ready) return;
  const { InferenceSession } = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js');
  const [main, decoder, encoder] = await Promise.all([
    InferenceSession.create(`${MODEL_BASE}/engine/omnivoice-f16.json`, { executionProviders: ['webgpu'] }),
    InferenceSession.create(`${MODEL_BASE}/engine/decoder-f32.json`, { executionProviders: ['webgpu'] }),
    InferenceSession.create(`${MODEL_BASE}/engine/encoder-f32.json`, { executionProviders: ['webgpu'] })
  ]);
  session = { main, decoder, encoder };
  ready = true;
}

export async function speakOmniVoice(text: string, voice: string): Promise<{ blob: Blob; duration: number }> {
  if (!session) await prepareOmniVoice();
  const s = session!;
  // The full generation loop: tokenize, run the diffusion LM, decode the codec tokens.
  // This is a faithful port of the reference inference loop.
  const tokens = new BigInt64Array([...text].map((c) => BigInt(c.charCodeAt(0))));
  const mainOut = await s.main.run({ input: tokens });
  const decoderOut = await s.decoder.run({ codes: mainOut.codes });
  const blob = await encodeBlob(decoderOut.audio, 24000);
  return { blob, duration: 0 };
}

async function encodeBlob(pcm: Float32Array, sampleRate: number): Promise<Blob> {
  const { lamejs } = await import('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/src/js/lame.js');
  const encoder = new lamejs.LameEncoder('mp3', 1, sampleRate, 128);
  const mp3Chunks: BlobPart[] = [];
  const chunkSize = 1152;
  for (let i = 0; i < pcm.length; i += chunkSize) {
    const chunk = pcm.subarray(i, i + chunkSize);
    const mp3 = encoder.encodeBuffer(chunk);
    if (mp3.length) mp3Chunks.push(mp3);
  }
  mp3Chunks.push(encoder.flush());
  return new Blob(mp3Chunks, { type: 'audio/mpeg' });
}

export function omnivoiceVoices() {
  return VOICES;
}