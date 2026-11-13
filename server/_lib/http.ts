/**
 * What an endpoint reads from a request: Vercel's Node request, narrowed to the parts the handlers
 * use (the stream itself is only touched in `readJson`).
 */
export interface ApiRequest {
	method?: string;
	headers?: Record<string, string | string[] | undefined>;
	query?: Record<string, string | string[] | undefined>;
	body?: unknown;
}

/** What an endpoint writes through: Vercel's Node response helpers, narrowed to the ones used here. */
export interface ApiResponse {
	statusCode: number;
	status: (code: number) => ApiResponse;
	json: (body: unknown) => unknown;
	setHeader?: (name: string, value: string) => unknown;
	end?: (body?: string) => unknown;
}

export async function readJson(req: ApiRequest): Promise<Record<string, unknown>> {
	if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
	if (typeof req.body === 'string') return JSON.parse(req.body);
	let raw = '';
	// A request without a parsed body (a plain Node request) is read from its stream.
	for await (const chunk of req as unknown as AsyncIterable<Uint8Array | string>) raw += chunk;
	return raw ? JSON.parse(raw) : {};
}

export function respond(res: ApiResponse, status: number, body: unknown): unknown {
	if (typeof res.status === 'function') return res.status(status).json(body);
	res.statusCode = status;
	res.setHeader?.('content-type', 'application/json; charset=utf-8');
	res.end?.(JSON.stringify(body));
	return undefined;
}

export function isMethod(req: ApiRequest, ...methods: string[]) {
	return methods.includes(req.method ?? 'GET');
}
