/// <reference lib="webworker" />
// Encodes rendered audio as a 16-bit mono WAV file off the main thread: a whole listening story is
// millions of samples, which would freeze the page for a moment if done there.
import { serveWorker, type Call } from '#lib/workers/protocol.js';
import { encodeWav } from './wavEncoding.js';

export type WavProtocol = { encode: Call<{ samples: Float32Array; sampleRate: number }, ArrayBuffer> };

serveWorker<WavProtocol>(self, {
  encode({ samples, sampleRate }, { transfer }) {
    const bytes = encodeWav(samples, sampleRate);
    transfer(bytes);
    return bytes;
  }
});
