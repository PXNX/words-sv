import { describe, expect, it } from 'vitest';
import { chunkText, parseSse, requestError, streamCloudReply } from '../src/lib/conversation/openRouter';

const chunk = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

describe('OpenRouter client', () => {
  it('splits server-sent events and keeps an unfinished line for later', () => {
    const { payloads, rest } = parseSse(': OPENROUTER PROCESSING\n\ndata: {"a":1}\n\ndata: [DO');
    expect(payloads).toEqual(['{"a":1}']);
    expect(rest).toBe('data: [DO');
  });

  it('reads text pieces, the end marker and errors', () => {
    expect(chunkText(JSON.stringify({ choices: [{ delta: { content: 'Hallo' } }] }))).toBe('Hallo');
    expect(chunkText(JSON.stringify({ choices: [{ delta: {} }] }))).toBeNull();
    expect(chunkText('[DONE]')).toBe('done');
    expect(chunkText('{broken')).toBeNull();
    expect(() => chunkText(JSON.stringify({ error: { message: 'Rate limited' } }))).toThrow('Rate limited');
  });

  it('names the usual failures', () => {
    expect(requestError(401, '{"error":{"message":"No auth"}}').message).toBe('openrouter_key: No auth');
    expect(requestError(402, '').message).toBe('openrouter_credit');
    expect(requestError(404, 'not found').message).toBe('openrouter_model: not found');
  });

  it('streams a reply with the key, the model and the messages', async () => {
    const parts = [chunk('Guten '), chunk('Tag!'), 'data: [DONE]\n\n'];
    let sent: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          // Split mid-line to test buffering across chunks.
          const all = new TextEncoder().encode(parts.join(''));
          controller.enqueue(all.slice(0, 20));
          controller.enqueue(all.slice(20));
          controller.close();
        }
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;
    const seen: string[] = [];
    const reply = await streamCloudReply({ apiKey: 'sk-test', model: 'some/model', messages: [{ role: 'user', content: 'Hi' }], onText: (text) => seen.push(text), fetchImpl });
    expect(reply).toBe('Guten Tag!');
    expect(seen).toEqual(['Guten ', 'Guten Tag!']);
    const request = sent as unknown as { url: string; init: RequestInit };
    expect((request.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(request.init.body as string)).toMatchObject({ model: 'some/model', stream: true });
  });

  it('throws a named error on a bad key', async () => {
    const fetchImpl = (async () => new Response('{"error":{"message":"Invalid key"}}', { status: 401 })) as unknown as typeof fetch;
    await expect(streamCloudReply({ apiKey: 'x', model: 'm', messages: [], onText: () => {}, fetchImpl })).rejects.toThrow('openrouter_key');
  });
});
