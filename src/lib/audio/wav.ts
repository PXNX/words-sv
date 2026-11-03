import { encodeWav } from './wavEncoding.js';

// One shared encoder worker; it is only started the first time a file is encoded.
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (bytes: ArrayBuffer) => void>();

function encoder() {
  worker ??= (() => {
    const created = new Worker(new URL('./wav.worker.ts', import.meta.url), { type: 'module' });
    created.addEventListener('message', ({ data }: MessageEvent<{ id: number; bytes: ArrayBuffer }>) => {
      pending.get(data.id)?.(data.bytes);
      pending.delete(data.id);
    });
    return created;
  })();
  return worker;
}

/** A WAV file of the buffer's first channel, encoded in a worker (inline where workers are missing). */
export async function wavBlob(buffer: AudioBuffer): Promise<Blob> {
  const samples = buffer.getChannelData(0).slice();
  if (typeof Worker === 'undefined') return new Blob([encodeWav(samples, buffer.sampleRate)], { type: 'audio/wav' });
  const id = ++nextId;
  const bytes = await new Promise<ArrayBuffer>((resolve) => {
    pending.set(id, resolve);
    encoder().postMessage({ id, samples, sampleRate: buffer.sampleRate }, [samples.buffer]);
  });
  return new Blob([bytes], { type: 'audio/wav' });
}
