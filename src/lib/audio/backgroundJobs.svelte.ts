/*
 * Long-running work that keeps going while the learner moves on to another mode: rendering a
 * listening story, filling the word bank, downloading a model. A job lives at module level, not in
 * a component, so leaving the page does not stop it; coming back attaches to the running job
 * (same key) instead of starting it again. BackgroundJobsBadge shows what is running from any page.
 */

// `done`/`total` count the current piece of work; `step`/`steps` count pieces in a multi-part job.
export type JobProgress = { done: number; total: number; step?: number; steps?: number; detail?: string };
export type JobStatus = 'running' | 'done' | 'failed' | 'cancelled';
export type JobView = { key: string; label: string; route: string; status: JobStatus; progress: JobProgress; startedAt: number; finishedAt?: number };
export type JobControl = { cancelled: () => boolean; progress: (progress: JobProgress) => void };

type Entry = { view: JobView; promise: Promise<unknown>; cancelled: boolean; listeners: Set<(progress: JobProgress) => void> };

export const backgroundJobs = $state<{ jobs: JobView[] }>({ jobs: [] });
const entries = new Map<string, Entry>();

function publish() {
  backgroundJobs.jobs = [...entries.values()].map((entry) => ({ ...entry.view, progress: { ...entry.view.progress } }));
}

/**
 * Runs `work` as a background job, or joins the job already running under `key`. `onProgress`
 * hears every progress update of that job, also when it joins one that was started earlier.
 */
export function runJob<T>(key: string, label: string, route: string, work: (control: JobControl) => Promise<T>, onProgress?: (progress: JobProgress) => void): Promise<T> {
  const running = entries.get(key);
  if (running && running.view.status === 'running') {
    if (onProgress) {
      running.listeners.add(onProgress);
      onProgress(running.view.progress);
    }
    return running.promise as Promise<T>;
  }
  const entry: Entry = {
    view: { key, label, route, status: 'running', progress: { done: 0, total: 0 }, startedAt: Date.now() },
    promise: Promise.resolve(),
    cancelled: false,
    listeners: new Set(onProgress ? [onProgress] : [])
  };
  const control: JobControl = {
    cancelled: () => entry.cancelled,
    progress: (progress) => {
      if (entry.cancelled) return;
      entry.view.progress = progress;
      for (const listener of entry.listeners) listener(progress);
      publish();
    }
  };
  entry.promise = (async () => {
    try {
      const result = await work(control);
      entry.view.status = entry.cancelled ? 'cancelled' : 'done';
      return result;
    } catch (error) {
      entry.view.status = entry.cancelled ? 'cancelled' : 'failed';
      throw error;
    } finally {
      entry.view.finishedAt = Date.now();
      entry.listeners.clear();
      publish();
    }
  })();
  entries.set(key, entry);
  publish();
  return entry.promise as Promise<T>;
}

/** Stops a job at its next checkpoint (an explicit "skip", a language change). */
export function cancelJob(key: string) {
  const entry = entries.get(key);
  if (!entry || entry.view.status !== 'running') return;
  entry.cancelled = true;
  entry.view.status = 'cancelled';
  publish();
}

/** Stops listening to a job's progress without stopping the job (a page that is closed). */
export function detachJob(key: string, onProgress: (progress: JobProgress) => void) {
  entries.get(key)?.listeners.delete(onProgress);
}

/** Forgets finished jobs, so the badge only lists what is running or newly done. */
export function dismissFinishedJobs() {
  for (const [key, entry] of entries) if (entry.view.status !== 'running') entries.delete(key);
  publish();
}

/** Stops every running job under `prefix` except `keep` (a level change makes the old one useless). */
export function cancelJobsExcept(prefix: string, keep: string) {
  for (const key of entries.keys()) if (key.startsWith(prefix) && key !== keep) cancelJob(key);
}

/** How far a job is, 0…1, counting finished steps of a multi-part job. */
export function jobFraction(progress: JobProgress): number {
  const part = progress.total ? progress.done / progress.total : 0;
  if (!progress.steps) return part;
  return Math.min(1, ((progress.step ?? 0) + part) / progress.steps);
}
