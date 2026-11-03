import { describe, expect, it } from 'vitest';
import { encodeWav } from '../src/lib/audio/wavEncoding.js';

describe('WAV encoding', () => {
  it('writes a 16-bit mono header and clamps samples', () => {
    const bytes = encodeWav(new Float32Array([0, 1, -1, 2]), 22050);
    const view = new DataView(bytes);
    expect(bytes.byteLength).toBe(44 + 8);
    expect(String.fromCharCode(...new Uint8Array(bytes, 0, 4))).toBe('RIFF');
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff);
  });
});
