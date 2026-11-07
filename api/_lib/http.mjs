/**
 * What an endpoint reads from a request: Vercel's Node request, narrowed to the parts the handlers
 * use (the stream itself is only touched in `readJson`).
 * @typedef {object} ApiRequest
 * @property {string} [method]
 * @property {Record<string, string | string[] | undefined>} [headers]
 * @property {unknown} [body]
 */

/**
 * What an endpoint writes through: Vercel's Node response helpers, narrowed to the ones used here.
 * @typedef {object} ApiResponse
 * @property {number} statusCode
 * @property {(code: number) => ApiResponse} status
 * @property {(body: unknown) => unknown} json
 * @property {(name: string, value: string) => unknown} [setHeader]
 * @property {(body?: string) => unknown} [end]
 */

/** @param {ApiRequest} req @returns {Promise<Record<string, unknown>>} */
export async function readJson(req) {
	if (req.body && typeof req.body === 'object') return /** @type {Record<string, unknown>} */ (req.body);
	if (typeof req.body === 'string') return JSON.parse(req.body);
	let raw = '';
	// A request without a parsed body (a plain Node request) is read from its stream.
	for await (const chunk of /** @type {AsyncIterable<Uint8Array | string>} */ (/** @type {unknown} */ (req))) raw += chunk;
	return raw ? JSON.parse(raw) : {};
}

/** @param {ApiResponse} res @param {number} status @param {unknown} body */
export function respond(res, status, body) {
	if (typeof res.status === 'function') return res.status(status).json(body);
	res.statusCode = status;
	res.setHeader?.('content-type', 'application/json; charset=utf-8');
	res.end?.(JSON.stringify(body));
	return undefined;
}

/** @param {ApiRequest} req @param {...string} methods */
export function isMethod(req, ...methods) {
	return methods.includes(req.method ?? 'GET');
}
