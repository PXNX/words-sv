// The device's WebGPU check result for the whole app: run once (per browser version) before the first
// on-device model loads, remembered in localStorage, and shown in the settings with a re-test button.
import { isCurrentResult, runWebGpuCheck, type GpuLike, type WebGpuResult } from './webgpuCheck.js';

const STORAGE_KEY = 'wordcircle-webgpu-check-v1';

function stored(): WebGpuResult | null {
  if (typeof localStorage === 'undefined' || typeof navigator === 'undefined') return null;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isCurrentResult(value, navigator.userAgent) ? value : null;
  } catch {
    return null;
  }
}

export const webgpu = $state<{ result: WebGpuResult | null; running: boolean }>({ result: stored(), running: false });

let pending: Promise<WebGpuResult> | null = null;

/** Runs the check (again when `force`); concurrent callers share one run. */
export function checkWebGpu(force = false): Promise<WebGpuResult> {
  if (webgpu.result && !force) return Promise.resolve(webgpu.result);
  pending ??= (async () => {
    webgpu.running = true;
    try {
      const gpu = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { gpu?: GpuLike }).gpu;
      const result = await runWebGpuCheck(gpu, { userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent });
      webgpu.result = result;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(result)); } catch { /* checked again next time */ }
      return result;
    } finally {
      webgpu.running = false;
      pending = null;
    }
  })();
  return pending;
}

/** Whether models that need WebGPU may load: true only after a passed check. */
export async function webgpuUsable(): Promise<boolean> {
  return (await checkWebGpu()).status === 'ok';
}
