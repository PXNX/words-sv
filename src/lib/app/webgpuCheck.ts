// A real WebGPU check, run once before the first on-device AI model (chat model or neural voice) is
// used: a GPU adapter can be reported and still fail to give a device or to compute, which is what
// models need. The check asks for an adapter and a device, runs a tiny compute shader (doubling four
// numbers) and reads the result back. Pure apart from the `gpu` object it is handed, so it is tested
// with a fake one; the reactive state and storage live in webgpuCheck.svelte.ts.

export type WebGpuStatus = 'ok' | 'no-api' | 'no-adapter' | 'no-device' | 'compute-failed';

export interface WebGpuResult {
  status: WebGpuStatus;
  /** Vendor and architecture as the browser reports them. */
  gpu: string | null;
  /** 16-bit floats in shaders: models load their smaller f16 builds. */
  f16: boolean;
  maxBufferMB: number | null;
  /** How long the whole check took, in ms. */
  ms: number;
  /** When it ran (epoch ms) and in which browser, so a browser update checks again. */
  at: number;
  userAgent: string;
  error?: string;
}

/** The slice of the WebGPU API the check uses (structurally `navigator.gpu`). */
export interface GpuLike {
  requestAdapter(): Promise<AdapterLike | null>;
}
export interface AdapterLike {
  features: { has(name: string): boolean };
  limits?: { maxBufferSize?: number };
  info?: { vendor?: string; architecture?: string; description?: string };
  requestDevice(descriptor?: { requiredFeatures?: string[] }): Promise<DeviceLike>;
}
export interface DeviceLike {
  createBuffer(descriptor: { size: number; usage: number; mappedAtCreation?: boolean }): BufferLike;
  createShaderModule(descriptor: { code: string }): unknown;
  createComputePipeline(descriptor: { layout: 'auto'; compute: { module: unknown; entryPoint: string } }): { getBindGroupLayout(index: number): unknown };
  createBindGroup(descriptor: { layout: unknown; entries: Array<{ binding: number; resource: { buffer: BufferLike } }> }): unknown;
  createCommandEncoder(): {
    beginComputePass(): { setPipeline(pipeline: unknown): void; setBindGroup(index: number, group: unknown): void; dispatchWorkgroups(count: number): void; end(): void };
    copyBufferToBuffer(source: BufferLike, sourceOffset: number, destination: BufferLike, destinationOffset: number, size: number): void;
    finish(): unknown;
  };
  queue: { submit(buffers: unknown[]): void; writeBuffer(buffer: BufferLike, offset: number, data: ArrayBufferView): void };
  destroy?(): void;
}
export interface BufferLike {
  mapAsync(mode: number): Promise<void>;
  getMappedRange(): ArrayBuffer;
  unmap(): void;
  destroy?(): void;
}

// GPUBufferUsage / GPUMapMode values, so the check runs where those globals are missing (tests).
const USAGE = { MAP_READ: 0x0001, COPY_SRC: 0x0004, COPY_DST: 0x0008, STORAGE: 0x0080 };
const MAP_READ = 0x0001;
const INPUT = [1, 2, 3, 4.5];
const SHADER = `@group(0) @binding(0) var<storage, read_write> data: array<f32>;
@compute @workgroup_size(4) fn main(@builtin(global_invocation_id) id: vec3<u32>) { data[id.x] = data[id.x] * 2.0; }`;

function withTimeout<T>(promise: Promise<T>, ms: number, reason: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(reason)), ms))]);
}

export async function runWebGpuCheck(gpu: GpuLike | undefined, { now = () => Date.now(), userAgent = '', timeoutMs = 8000 } = {}): Promise<WebGpuResult> {
  const started = now();
  const result = (status: WebGpuStatus, extra: Partial<WebGpuResult> = {}): WebGpuResult => ({ status, gpu: null, f16: false, maxBufferMB: null, ...extra, ms: Math.max(0, now() - started), at: now(), userAgent });
  if (!gpu) return result('no-api');
  let adapter: AdapterLike | null;
  try {
    adapter = await withTimeout(gpu.requestAdapter(), timeoutMs, 'adapter_timeout');
  } catch (error) {
    return result('no-adapter', { error: String(error instanceof Error ? error.message : error) });
  }
  if (!adapter) return result('no-adapter');
  const info = adapter.info ?? {};
  const facts = {
    gpu: [info.vendor, info.architecture || info.description].filter(Boolean).join(' ') || null,
    f16: adapter.features.has('shader-f16'),
    maxBufferMB: adapter.limits?.maxBufferSize ? Math.round(adapter.limits.maxBufferSize / 1_048_576) : null
  };
  let device: DeviceLike;
  try {
    device = await withTimeout(adapter.requestDevice(), timeoutMs, 'device_timeout');
  } catch (error) {
    return result('no-device', { ...facts, error: String(error instanceof Error ? error.message : error) });
  }
  try {
    const bytes = INPUT.length * 4;
    const storage = device.createBuffer({ size: bytes, usage: USAGE.STORAGE | USAGE.COPY_SRC | USAGE.COPY_DST });
    const readback = device.createBuffer({ size: bytes, usage: USAGE.MAP_READ | USAGE.COPY_DST });
    device.queue.writeBuffer(storage, 0, new Float32Array(INPUT));
    const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code: SHADER }), entryPoint: 'main' } });
    const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: storage } }] });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(1);
    pass.end();
    encoder.copyBufferToBuffer(storage, 0, readback, 0, bytes);
    device.queue.submit([encoder.finish()]);
    await withTimeout(readback.mapAsync(MAP_READ), timeoutMs, 'compute_timeout');
    const output = Array.from(new Float32Array(readback.getMappedRange().slice(0)));
    readback.unmap();
    storage.destroy?.();
    readback.destroy?.();
    const correct = output.length === INPUT.length && output.every((value, index) => value === INPUT[index]! * 2);
    return correct ? result('ok', facts) : result('compute-failed', { ...facts, error: `wrong result ${output.join(',')}` });
  } catch (error) {
    return result('compute-failed', { ...facts, error: String(error instanceof Error ? error.message : error) });
  } finally {
    device.destroy?.();
  }
}

/** A stored result still counts while the browser is the same one; older or foreign data runs again. */
export function isCurrentResult(value: unknown, userAgent: string): value is WebGpuResult {
  if (!value || typeof value !== 'object') return false;
  const stored = value as Partial<WebGpuResult>;
  return typeof stored.status === 'string' && ['ok', 'no-api', 'no-adapter', 'no-device', 'compute-failed'].includes(stored.status) && stored.userAgent === userAgent && typeof stored.at === 'number';
}
