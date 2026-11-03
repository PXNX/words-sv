/*
 * Runs one task at a time, foreground before background. Speech engines use it so a line the open
 * mode wants to say right now never waits behind audio rendered for later (the word bank, a
 * listening story being prepared while the learner plays something else).
 */
export type Priority = 'foreground' | 'background';

type Queued<T> = { run: () => Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

export function createPriorityQueue() {
  const queues: Record<Priority, Queued<unknown>[]> = { foreground: [], background: [] };
  let busy = false;

  function pump() {
    if (busy) return;
    const next = queues.foreground.shift() ?? queues.background.shift();
    if (!next) return;
    busy = true;
    next.run().then(next.resolve, next.reject).finally(() => {
      busy = false;
      pump();
    });
  }

  return {
    push<T>(run: () => Promise<T>, priority: Priority = 'foreground'): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queues[priority].push({ run, resolve: resolve as (value: unknown) => void, reject });
        pump();
      });
    },
    /** Fails everything still waiting (a restarted engine). The running task is left to finish. */
    clear(reason = 'cleared') {
      for (const queued of [...queues.foreground, ...queues.background]) queued.reject(new Error(reason));
      queues.foreground = [];
      queues.background = [];
    },
    get size() {
      return queues.foreground.length + queues.background.length + (busy ? 1 : 0);
    }
  };
}
