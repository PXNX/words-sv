// What a long-running load is doing right now, for DownloadProgress.svelte: fetching files over the
// network, reading them from the cache into memory (RAM/GPU), or installing a new app version.
export type ProgressPhase = 'download' | 'load' | 'update';

/**
 * WebLLM reports "… 120MB fetched" while downloading and "Loading model from cache … MB loaded" or
 * "Finish loading on WebGPU" once the files are local. Anything else counts as downloading.
 */
export function modelProgressPhase(text: string): ProgressPhase {
  if (/fetched|fetching/iu.test(text)) return 'download';
  if (/loaded|from cache|loading on|webgpu|shader|compil/iu.test(text)) return 'load';
  return 'download';
}

/** 0..1 clamped, or null for an unknown amount (indeterminate bar). */
export function clampProgress(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}
