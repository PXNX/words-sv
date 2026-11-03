/// <reference lib="webworker" />
// Encodes rendered audio as a 16-bit mono WAV file off the main thread: a whole listening story is
// millions of samples, which would freeze the page for a moment if done there.
import { encodeWav } from './wavEncoding.js';

self.onmessage = ({ data }: MessageEvent<{ id: number; samples: Float32Array; sampleRate: number }>) => {
  const bytes = encodeWav(data.samples, data.sampleRate);
  self.postMessage({ id: data.id, bytes }, [bytes]);
};
