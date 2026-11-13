/*
 * The only Vercel function: forwards every /api/* request (routed here by vercel.json) to WordCircle's
 * API server (server/main.ts), which runs next to its database. API_ORIGIN, set in the Vercel project,
 * says where that server is, e.g. https://example.com/wordcircle; it is never part of the repository.
 */
const FORWARDED_HEADERS = ['authorization', 'content-type', 'accept', 'user-agent'];
const TIMEOUT_MS = 25_000;

export async function proxy(request: Request, origin = process.env.API_ORIGIN ?? ''): Promise<Response> {
	if (!origin) return Response.json({ ok: false, error: 'api_not_configured' }, { status: 503 });
	const incoming = new URL(request.url);
	const path = (incoming.searchParams.get('path') ?? '').replace(/^\/+/u, '');
	if (!/^[a-z0-9/_-]*$/u.test(path)) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
	const target = new URL(`${origin.replace(/\/+$/u, '')}/api/${path}`);
	incoming.searchParams.forEach((value, key) => { if (key !== 'path') target.searchParams.append(key, value); });
	const headers = new Headers();
	for (const name of FORWARDED_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
	try {
		const response = await fetch(target, {
			method: request.method,
			headers,
			body: request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer(),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		return new Response(response.body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
	} catch {
		return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
	}
}

export const GET = (request: Request) => proxy(request);
export const POST = (request: Request) => proxy(request);
export const PUT = (request: Request) => proxy(request);
export const PATCH = (request: Request) => proxy(request);
export const DELETE = (request: Request) => proxy(request);
