type ApiResponse = import('../../api/_lib/http.mjs').ApiResponse;

/**
 * A response stand-in that is structurally an `ApiResponse` (Vercel's helpers) and also exposes the
 * captured `result` for assertions. `status()` and `json()` return the same object, as Vercel's do.
 */
export function responseCapture() {
  const result: { statusCode: number; body: any } = { statusCode: 200, body: null };
  const res = {
    result,
    get statusCode() {
      return result.statusCode;
    },
    set statusCode(value: number) {
      result.statusCode = value;
    },
    get body() {
      return result.body;
    },
    set body(value: unknown) {
      result.body = value;
    },
    status(code: number) {
      result.statusCode = code;
      return res as unknown as ApiResponse;
    },
    json(body: unknown) {
      result.body = body;
      return res as unknown as ApiResponse;
    }
  };
  return res;
}