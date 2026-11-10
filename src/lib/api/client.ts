// A typed fetch client for the server functions in `api/`: one place that posts JSON, checks the
// status and validates the reply against its schema.
import * as v from 'valibot';

export type ApiPath = '/api/telegram/device' | '/api/push/public-key' | '/api/push/subscribe' | '/api/push/unsubscribe' | '/api/streak/progress' | '/api/progress/sync' | '/api/games/score' | '/api/store';

/** Why a call failed: the server's own `error` code where it sent one, else a generic reason. */
export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = 'ApiError';
  }
}

export type ApiOptions = {
  /** JSON body; without one the call is a GET. */
  body?: unknown;
  /** Statuses besides 2xx whose body is still a valid answer (e.g. 409 for a sync conflict). */
  accept?: readonly number[];
  fetcher?: typeof fetch;
};

function errorCode(body: unknown, fallback: string): string {
  return body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : fallback;
}

export async function callApi<const S extends v.GenericSchema>(path: ApiPath, schema: S, { body, accept = [], fetcher = fetch }: ApiOptions = {}): Promise<v.InferOutput<S>> {
  const init: RequestInit = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  const response = await fetcher(path, init);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok && !accept.includes(response.status)) throw new ApiError(errorCode(data, 'unavailable'), response.status);
  const parsed = v.safeParse(schema, data);
  if (!parsed.success) throw new ApiError(errorCode(data, 'invalid_response'), response.status);
  return parsed.output;
}
