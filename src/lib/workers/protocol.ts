// One typed request/reply protocol for every worker (LLM, speech engines, WAV encoding).
//
// A protocol names each call with what the page sends (`params`), what the worker answers once
// it is done (`result`) and what it may stream in between (`update`). Both sides derive their
// message types from it, so a call, its updates and its result can never drift apart:
//
//   type Tts = { load: Call<object, void, Progress>; speak: Call<{ text: string }, Pcm> };
//   const client = createWorkerClient<Tts>(() => new Worker(...));     // page
//   serveWorker<Tts>(self, { load: async (_, { update }) => ..., speak: async ({ text }) => ... });  // worker
//
// Pure apart from the `Port` it is given, so it is tested with an in-memory pair of ports.

/** One call of a protocol. */
export type Call<Params extends object = Record<never, never>, Result = void, Update = never> = { params: Params; result: Result; update: Update };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Protocol = Record<string, Call<any, any, any>>;

export type CallName<P extends Protocol> = keyof P & string;

/** What the page posts to the worker. */
export type RequestMessage<P extends Protocol> = { [K in CallName<P>]: { id: number; type: K; params: P[K]['params'] } }[CallName<P>];

/** What the worker posts back: any number of updates, then exactly one result or error. */
export type ReplyMessage<P extends Protocol> =
  | { [K in CallName<P>]: { id: number; type: K; kind: 'update'; update: P[K]['update'] } | { id: number; type: K; kind: 'done'; result: P[K]['result'] } }[CallName<P>]
  | { id: number; kind: 'error'; message: string };

/** The part of a Worker (or of a worker's global scope) the protocol needs. */
export interface Port<Incoming, Outgoing> {
  postMessage(message: Outgoing, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: { data: Incoming }) => void): void;
  addEventListener(type: 'error', listener: (event: { message?: string; preventDefault?: () => void }) => void): void;
  terminate?(): void;
}

export type RequestOptions<Update> = {
  onUpdate?: (update: Update) => void;
  /** Restarts the worker (failing every waiting call) when no result arrived in time. */
  timeoutMs?: number;
  transfer?: Transferable[];
};

export type WorkerClient<P extends Protocol> = {
  request<K extends CallName<P>>(type: K, params: P[K]['params'], options?: RequestOptions<P[K]['update']>): Promise<P[K]['result']>;
  /** Stops the worker; every waiting call fails with `reason`. The next request starts a new one. */
  restart(reason?: string): void;
  readonly running: boolean;
};

export type ClientOptions = {
  /** Runs after every restart, also one caused by a timeout or a crashed worker. */
  onRestart?: (reason: string) => void;
  /** The error for a worker the browser killed (most often for running out of memory). */
  crashMessage?: string;
};

type Waiting = { onReply: (reply: ReplyMessage<Protocol>) => void; fail: (error: Error) => void };

export function createWorkerClient<P extends Protocol>(spawn: () => Port<ReplyMessage<P>, RequestMessage<P>>, options: ClientOptions = {}): WorkerClient<P> {
  let port: Port<ReplyMessage<P>, RequestMessage<P>> | null = null;
  let nextId = 0;
  const waiting = new Map<number, Waiting>();

  function restart(reason = 'restarted') {
    port?.terminate?.();
    port = null;
    const failed = [...waiting.values()];
    waiting.clear();
    for (const call of failed) call.fail(new Error(reason));
    options.onRestart?.(reason);
  }

  function ensurePort() {
    if (port) return port;
    const created = spawn();
    created.addEventListener('message', ({ data }) => waiting.get(data.id)?.onReply(data as ReplyMessage<Protocol>));
    // A worker that died never answers again: fail what is waiting instead of hanging.
    created.addEventListener('error', (event) => {
      event.preventDefault?.();
      if (port === created) restart(event.message || options.crashMessage || 'worker_crashed');
    });
    port = created;
    return created;
  }

  return {
    request(type, params, { onUpdate, timeoutMs = 0, transfer } = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const timer = timeoutMs ? setTimeout(() => restart('timeout'), timeoutMs) : undefined;
        const settle = () => {
          clearTimeout(timer);
          waiting.delete(id);
        };
        waiting.set(id, {
          onReply(reply) {
            if (reply.kind === 'update') return onUpdate?.(reply.update);
            settle();
            if (reply.kind === 'error') reject(new Error(reply.message));
            else resolve(reply.result);
          },
          fail(error) {
            clearTimeout(timer);
            reject(error);
          }
        });
        const message = { id, type, params } as RequestMessage<P>;
        ensurePort().postMessage(message, transfer ?? []);
      });
    },
    restart,
    get running() {
      return port !== null;
    }
  };
}

/** What a handler may do besides returning its result. */
export type CallContext<Update> = {
  id: number;
  update(update: Update, transfer?: Transferable[]): void;
  /** Buffers to move (not copy) along with the result. */
  transfer(...buffers: Transferable[]): void;
};

export type Handlers<P extends Protocol> = {
  [K in CallName<P>]: (params: P[K]['params'], context: CallContext<P[K]['update']>) => P[K]['result'] | Promise<P[K]['result']>;
};

/** Answers the page's requests inside the worker; calls run concurrently, each in its own handler. */
export function serveWorker<P extends Protocol>(scope: Port<RequestMessage<P>, ReplyMessage<P>>, handlers: Handlers<P>): void {
  scope.addEventListener('message', ({ data }) => {
    void handle(data);
  });

  async function handle<K extends CallName<P>>(request: { id: number; type: K; params: P[K]['params'] }) {
    const { id, type } = request;
    const moved: Transferable[] = [];
    const context: CallContext<P[K]['update']> = {
      id,
      update: (update, transfer = []) => scope.postMessage({ id, type, kind: 'update', update } as ReplyMessage<P>, transfer),
      transfer: (...buffers) => void moved.push(...buffers)
    };
    try {
      const handler = handlers[type];
      if (!handler) throw new Error(`unknown_call ${type}`);
      const result = await handler(request.params, context);
      scope.postMessage({ id, type, kind: 'done', result } as ReplyMessage<P>, moved);
    } catch (error) {
      scope.postMessage({ id, kind: 'error', message: error instanceof Error ? error.message : String(error) }, []);
    }
  }
}
