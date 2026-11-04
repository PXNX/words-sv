/*
 * Downloads big model files in a way that survives bad connections: the file is fetched in chunks
 * with HTTP Range requests, every finished chunk is stored in the Cache API at once, and a broken
 * connection only loses the chunk in flight. The next attempt (now, after a retry delay, or after a
 * reload days later) continues where it stopped. Each chunk is retried a few times with back-off.
 *
 * Works in pages and workers. Servers without Range support (rare; Hugging Face has it) fall back
 * to one plain download, still cached afterwards.
 */
const CHUNK_BYTES = 8 * 1024 * 1024;
const RETRIES = 5;

export type DownloadProgress = (loaded: number, total: number) => void;

function chunkKey(url: string, index: number) {
  return `${url}#chunk=${index}`;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok || response.status === 206) return response;
      lastError = new Error(`HTTP ${response.status}`);
      // A client error will not get better by asking again.
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(16_000, 1000 * 2 ** attempt)));
  }
  throw lastError instanceof Error ? lastError : new Error('download failed');
}

// The file size is remembered next to the chunks, so a resumed or offline check needs no network.
async function sizeOf(url: string, cache: Cache): Promise<number | null> {
  const remembered = await cache.match(`${url}#size`);
  if (remembered) return Number(await remembered.text()) || null;
  try {
    const response = await fetchWithRetry(url, { method: 'HEAD' });
    const length = Number(response.headers.get('content-length'));
    // Accept-Ranges is hidden from scripts by CORS; a chunk answered with 206 proves Range support.
    const size = length > 0 ? length : null;
    if (size) await cache.put(`${url}#size`, new Response(String(size))).catch(() => undefined);
    return size;
  } catch {
    return null;
  }
}

/** The whole file as bytes, from the cache where possible, resuming any partial download. */
export async function resumableDownload(url: string, cacheName: string, onProgress?: DownloadProgress): Promise<Uint8Array> {
  const cache = await caches.open(cacheName);
  const whole = await cache.match(url);
  if (whole) {
    const bytes = new Uint8Array(await whole.arrayBuffer());
    onProgress?.(bytes.length, bytes.length);
    return bytes;
  }
  const total = await sizeOf(url, cache);
  if (!total) {
    const response = await fetchWithRetry(url, {});
    const bytes = new Uint8Array(await response.arrayBuffer());
    await cache.put(url, new Response(bytes)).catch(() => undefined);
    onProgress?.(bytes.length, bytes.length);
    return bytes;
  }
  const bytes = new Uint8Array(total);
  const chunks = Math.ceil(total / CHUNK_BYTES);
  let loaded = 0;
  for (let index = 0; index < chunks; index += 1) {
    const start = index * CHUNK_BYTES;
    const end = Math.min(total, start + CHUNK_BYTES) - 1;
    let piece: Uint8Array<ArrayBuffer>;
    const stored = await cache.match(chunkKey(url, index));
    if (stored) {
      piece = new Uint8Array(await stored.arrayBuffer());
    } else {
      const response = await fetchWithRetry(url, { headers: { Range: `bytes=${start}-${end}` } });
      if (response.status === 200) {
        // The server ignored the Range header and sent the whole file.
        const full = new Uint8Array(await response.arrayBuffer());
        await cache.put(url, new Response(full)).catch(() => undefined);
        onProgress?.(full.length, full.length);
        return full;
      }
      piece = new Uint8Array(await response.arrayBuffer());
      await cache.put(chunkKey(url, index), new Response(piece)).catch(() => undefined);
    }
    bytes.set(piece, start);
    loaded += piece.length;
    onProgress?.(loaded, total);
  }
  return bytes;
}

/** Whether every chunk (or the whole file) of `url` is already stored, i.e. it opens offline. */
export async function isDownloaded(url: string, cacheName: string): Promise<boolean> {
  const cache = await caches.open(cacheName);
  if (await cache.match(url)) return true;
  const total = await sizeOf(url, cache);
  if (!total) return false;
  for (let index = 0; index < Math.ceil(total / CHUNK_BYTES); index += 1) if (!(await cache.match(chunkKey(url, index)))) return false;
  return true;
}
