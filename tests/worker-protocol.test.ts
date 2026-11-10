import { describe, expect, it, vi } from 'vitest';
import { createWorkerClient, serveWorker, type Call, type Port, type ReplyMessage, type RequestMessage } from '../src/lib/workers/protocol';

type Echo = {
  add: Call<{ a: number; b: number }, number>;
  count: Call<{ to: number }, string, number>;
  fail: Call<object, void>;
  hang: Call<object, void>;
};

type Listener = (event: { data: unknown; message?: string; preventDefault?: () => void }) => void;

/** A page-side and a worker-side port joined in memory, delivering asynchronously like postMessage. */
function pair() {
  const toWorker: Listener[] = [];
  const toPage: Listener[] = [];
  const pageErrors: Listener[] = [];
  const transfers: Transferable[][] = [];
  let terminated = 0;
  const page = {
    postMessage: (data: unknown) => queueMicrotask(() => toWorker.forEach((listener) => listener({ data }))),
    addEventListener: (type: string, listener: Listener) => void (type === 'message' ? toPage : pageErrors).push(listener),
    terminate: () => void (terminated += 1)
  } as unknown as Port<ReplyMessage<Echo>, RequestMessage<Echo>>;
  const worker = {
    postMessage: (data: unknown, transfer: Transferable[] = []) => {
      transfers.push(transfer);
      queueMicrotask(() => toPage.forEach((listener) => listener({ data })));
    },
    addEventListener: (type: string, listener: Listener) => void (type === 'message' && toWorker.push(listener))
  } as unknown as Port<RequestMessage<Echo>, ReplyMessage<Echo>>;
  return { page, worker, transfers, crash: (message: string) => pageErrors.forEach((listener) => listener({ data: null, message })), terminated: () => terminated };
}

function setup(onRestart?: (reason: string) => void) {
  const ports = pair();
  serveWorker<Echo>(ports.worker, {
    add: ({ a, b }) => a + b,
    async count({ to }, { update, transfer }) {
      for (let step = 1; step <= to; step += 1) update(step);
      const buffer = new ArrayBuffer(4);
      transfer(buffer);
      return `counted ${to}`;
    },
    fail: () => { throw new Error('nope'); },
    hang: () => new Promise<void>(() => {})
  });
  const spawn = vi.fn(() => ports.page);
  return { client: createWorkerClient<Echo>(spawn, { onRestart }), spawn, ports };
}

describe('worker protocol', () => {
  it('resolves with the typed result', async () => {
    const { client } = setup();
    await expect(client.request('add', { a: 2, b: 3 })).resolves.toBe(5);
  });

  it('streams updates before the result and moves transferables with it', async () => {
    const { client, ports } = setup();
    const updates: number[] = [];
    await expect(client.request('count', { to: 3 }, { onUpdate: (step) => updates.push(step) })).resolves.toBe('counted 3');
    expect(updates).toEqual([1, 2, 3]);
    expect(ports.transfers.at(-1)).toHaveLength(1);
  });

  it('rejects with the worker error', async () => {
    const { client } = setup();
    await expect(client.request('fail', {})).rejects.toThrow('nope');
  });

  it('starts the worker once, on the first request', async () => {
    const { client, spawn } = setup();
    expect(client.running).toBe(false);
    await Promise.all([client.request('add', { a: 1, b: 1 }), client.request('add', { a: 2, b: 2 })]);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(client.running).toBe(true);
  });

  it('restarts after a timeout and fails what is waiting', async () => {
    vi.useFakeTimers();
    const onRestart = vi.fn();
    const { client, ports } = setup(onRestart);
    const hanging = client.request('hang', {}, { timeoutMs: 1000 });
    const other = client.request('hang', {});
    vi.advanceTimersByTime(1000);
    await expect(hanging).rejects.toThrow('timeout');
    await expect(other).rejects.toThrow('timeout');
    expect(onRestart).toHaveBeenCalledWith('timeout');
    expect(ports.terminated()).toBe(1);
    expect(client.running).toBe(false);
    vi.useRealTimers();
  });

  it('fails waiting calls when the worker crashes', async () => {
    const { client, ports } = setup();
    const hanging = client.request('hang', {});
    ports.crash('out of memory');
    await expect(hanging).rejects.toThrow('out of memory');
  });
});
