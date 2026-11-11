/*
 * OpenRouter as an opt-in second provider for the language model, with the learner's own API key
 * (bring your own key). The on-device model stays first: the app only calls OpenRouter when the
 * learner turned it on in the settings, either as a fallback where WebGPU does not work or always.
 * The key stays in this browser and goes only to OpenRouter. Pure apart from `fetch`, so the
 * stream parsing can be tested.
 */
import type { ChatMessage } from './conversation.js';

export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_KEYS_URL = 'https://openrouter.ai/settings/keys';
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/models';
/** A small, fast, multilingual model as the starting suggestion; any OpenRouter model id works. */
export const DEFAULT_CLOUD_MODEL = 'google/gemini-2.5-flash';

/** Splits streamed text into complete server-sent-event `data:` payloads and the unfinished rest. */
export function parseSse(buffer: string): { payloads: string[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const payloads = lines.map((line) => line.trimEnd()).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim());
  return { payloads, rest };
}

/** The text piece in one streamed chunk, `done` at the end of the stream, or null (comments, empty deltas). */
export function chunkText(payload: string): string | 'done' | null {
  if (payload === '[DONE]') return 'done';
  try {
    const value = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string | null } }>; error?: { message?: string } };
    if (value.error) throw new Error(value.error.message ?? 'openrouter_error');
    const text = value.choices?.[0]?.delta?.content;
    return typeof text === 'string' && text ? text : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

/** A readable reason for a failed request (bad key, no credit, unknown model, rate limit). */
export function requestError(status: number, body: string): Error {
  let message: string;
  try {
    message = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? '';
  } catch {
    message = body.slice(0, 200);
  }
  const reason = status === 401 ? 'openrouter_key' : status === 402 ? 'openrouter_credit' : status === 404 ? 'openrouter_model' : status === 429 ? 'openrouter_rate' : 'openrouter_error';
  return new Error(message ? `${reason}: ${message}` : reason);
}

export interface CloudRequest {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal | undefined;
  onText: (text: string) => void;
  fetchImpl?: typeof fetch;
  referer?: string | undefined;
}

/** Streams a chat reply from OpenRouter; `onText` gets the reply so far after every piece. */
export async function streamCloudReply({ apiKey, model, messages, signal, onText, fetchImpl = fetch, referer }: CloudRequest): Promise<string> {
  const response = await fetchImpl(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(referer ? { 'HTTP-Referer': referer } : {}),
      'X-Title': 'WordCircle'
    },
    body: JSON.stringify({ model, messages, stream: true }),
    ...(signal ? { signal } : {})
  });
  if (!response.ok || !response.body) throw requestError(response.status, await response.text().catch(() => ''));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { payloads, rest } = parseSse(buffer);
    buffer = rest;
    for (const payload of payloads) {
      const piece = chunkText(payload);
      if (piece === 'done') return reply;
      if (piece) {
        reply += piece;
        onText(reply);
      }
    }
  }
  return reply;
}
