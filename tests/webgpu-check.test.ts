import { describe, expect, it } from 'vitest';
import { isCurrentResult, runWebGpuCheck, type AdapterLike, type BufferLike, type DeviceLike, type GpuLike } from '../src/lib/app/webgpuCheck';

// A fake GPU that runs the "double every number" shader on the CPU (or breaks it on purpose).
function fakeGpu({ adapter = true, device = true, compute = (value: number) => value * 2, f16 = true } = {}): GpuLike {
  const makeDevice = (): DeviceLike => {
    let stored = new Float32Array(0);
    const buffer = (size: number): BufferLike & { data: Float32Array } => ({
      data: new Float32Array(size / 4),
      async mapAsync() {},
      getMappedRange() { return this.data.buffer as ArrayBuffer; },
      unmap() {}
    });
    let readback: ReturnType<typeof buffer> | null = null;
    return {
      createBuffer: ({ size, usage }) => {
        const created = buffer(size);
        if (usage & 0x0001) readback = created;
        return created;
      },
      createShaderModule: () => ({}),
      createComputePipeline: () => ({ getBindGroupLayout: () => ({}) }),
      createBindGroup: () => ({}),
      createCommandEncoder: () => ({
        beginComputePass: () => ({ setPipeline() {}, setBindGroup() {}, dispatchWorkgroups() { stored = stored.map(compute); }, end() {} }),
        copyBufferToBuffer: () => { readback!.data.set(stored); },
        finish: () => ({})
      }),
      queue: { submit() {}, writeBuffer: (_buffer, _offset, data) => { stored = new Float32Array((data as Float32Array).slice()); } }
    };
  };
  const fakeAdapter: AdapterLike = {
    features: { has: (name) => f16 && name === 'shader-f16' },
    limits: { maxBufferSize: 2 * 1_048_576 * 1024 },
    info: { vendor: 'acme', architecture: 'rdna' },
    requestDevice: async () => { if (!device) throw new Error('lost'); return makeDevice(); }
  };
  return { requestAdapter: async () => (adapter ? fakeAdapter : null) };
}

describe('WebGPU check', () => {
  it('passes when the shader doubles the numbers', async () => {
    const result = await runWebGpuCheck(fakeGpu(), { userAgent: 'ua' });
    expect(result).toMatchObject({ status: 'ok', gpu: 'acme rdna', f16: true, maxBufferMB: 2048, userAgent: 'ua' });
  });

  it('names the step that failed', async () => {
    expect((await runWebGpuCheck(undefined)).status).toBe('no-api');
    expect((await runWebGpuCheck(fakeGpu({ adapter: false }))).status).toBe('no-adapter');
    expect((await runWebGpuCheck(fakeGpu({ device: false }))).status).toBe('no-device');
    expect((await runWebGpuCheck(fakeGpu({ compute: (value) => value }))).status).toBe('compute-failed');
  });

  it('runs again in another browser version', async () => {
    const result = await runWebGpuCheck(fakeGpu(), { userAgent: 'Chrome/140' });
    expect(isCurrentResult(result, 'Chrome/140')).toBe(true);
    expect(isCurrentResult(result, 'Chrome/141')).toBe(false);
    expect(isCurrentResult({ status: 'maybe' }, 'Chrome/140')).toBe(false);
  });
});
