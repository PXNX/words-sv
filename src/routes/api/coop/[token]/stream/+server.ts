import { error, type RequestHandler } from '@sveltejs/kit';
import { getCoopEventsAfter, CoopRoomError } from '$lib/server/coop';
import { isParticipantId, isRoomToken } from '$lib/coop';

export const config = { maxDuration: 60 };
export const prerender = false;

const encoder = new TextEncoder();

function asCursor(value: string | null) {
  const cursor = Number(value);
  return Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : -1;
}

export const GET: RequestHandler = async ({ params, request, url }) => {
  const participantId = url.searchParams.get('participantId');
  const token = params.token;
  if (!isRoomToken(token) || !isParticipantId(participantId)) throw error(400, 'Invalid room request');
  let cursor = Math.max(asCursor(url.searchParams.get('after')), asCursor(request.headers.get('last-event-id')));
  try {
    await getCoopEventsAfter(token, cursor);
  } catch (cause) {
    if (cause instanceof CoopRoomError && cause.code === 'room_not_found') throw error(404, 'Room not found');
    throw error(503, 'Room stream unavailable');
  }
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let pollTimer: ReturnType<typeof setTimeout> | undefined;
      const heartbeatTimer = setInterval(() => send('heartbeat', { cursor }), 15_000);
      const send = (name: string, data: unknown, id?: number) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${typeof id === 'number' ? `id: ${id}\n` : ''}event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearTimeout(pollTimer);
        clearInterval(heartbeatTimer);
        try { controller.close(); } catch { /* A disconnected client has already closed the stream. */ }
      };
      const poll = async () => {
        if (closed) return;
        try {
          const events = await getCoopEventsAfter(token, cursor);
          for (const event of events) {
            cursor = event.version;
            send('room-event', event, event.version);
          }
          pollTimer = setTimeout(poll, 1_500);
        } catch {
          send('room-error', { error: 'room_unavailable' });
          close();
        }
      };
      request.signal.addEventListener('abort', close, { once: true });
      send('ready', { cursor });
      void poll();
    }
  });
  return new Response(stream, {
    headers: {
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no'
    }
  });
};
