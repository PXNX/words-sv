export async function readJson(req) {
	if (req.body && typeof req.body === 'object') return req.body;
	if (typeof req.body === 'string') return JSON.parse(req.body);
	let raw = '';
	for await (const chunk of req) raw += chunk;
	return raw ? JSON.parse(raw) : {};
}

export function respond(res, status, body) {
	if (typeof res.status === 'function') return res.status(status).json(body);
	res.statusCode = status;
	res.setHeader?.('content-type', 'application/json; charset=utf-8');
	res.end?.(JSON.stringify(body));
	return undefined;
}

export function isMethod(req, ...methods) {
	return methods.includes(req.method ?? 'GET');
}
