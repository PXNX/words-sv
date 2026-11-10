import { createWorkerClient } from '#lib/workers/protocol.js';
import type { WavProtocol } from './wav.worker.js';
import { encodeWav } from './wavEncoding.js';

// One shared encoder worker; it is only started the first time a file is encoded.
const encoder = createWorkerClient<WavProtocol>(() => new Worker(new URL('./wav.worker.ts', import.meta.url), { type: 'module' }));

/** A WAV file of the buffer's first channel, encoded in a worker (inline where workers are missing). */
export async function wavBlob(buffer: AudioBuffer): Promise<Blob> {
  const samples = buffer.getChannelData(0).slice();
  if (typeof Worker === 'undefined') return new Blob([encodeWav(samples, buffer.sampleRate)], { type: 'audio/wav' });
  const bytes = await encoder.request('encode', { samples, sampleRate: buffer.sampleRate }, { transfer: [samples.buffer] });
  return new Blob([bytes], { type: 'audio/wav' });
}
