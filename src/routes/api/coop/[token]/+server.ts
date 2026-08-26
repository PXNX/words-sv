import { json, type RequestHandler } from '@sveltejs/kit';
import { getCoopSnapshot, submitCoopGuess, CoopRoomError } from '$lib/server/coop';
import { isParticipantId, isRoomToken } from '$lib/coop';

const noStore = { 'cache-control': 'no-store' };

function failure(cause: unknown) {
  if (cause instanceof CoopRoomError) {
    if (cause.code === 'room_not_found') return json({ error: cause.code }, { status: 404, headers: noStore });
    if (cause.code === 'rate_limited') return json({ error: cause.code }, { status: 429, headers: noStore });
    return json({ error: cause.code }, { status: 503, headers: noStore });
  }
  console.error('Unable to access co-op room', cause);
  return json({ error: 'room_unavailable' }, { status: 503, headers: noStore });
}

export const GET: RequestHandler = async ({ params, url }) => {
  const participantId = url.searchParams.get('participantId');
  if (!isRoomToken(params.token) || !isParticipantId(participantId)) return json({ error: 'invalid_request' }, { status: 400, headers: noStore });
  try {
    return json(await getCoopSnapshot(params.token, participantId), { headers: noStore });
  } catch (cause) {
    return failure(cause);
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  if (!isRoomToken(params.token)) return json({ error: 'invalid_request' }, { status: 400, headers: noStore });
  try {
    const body: unknown = await request.json();
    const value = body as { participantId?: unknown; word?: unknown };
    if (!isParticipantId(value.participantId) || typeof value.word !== 'string' || !/^[A-ZÄÖÜẞ]{3,8}$/.test(value.word)) return json({ error: 'invalid_request' }, { status: 400, headers: noStore });
    return json(await submitCoopGuess(params.token, value.participantId, value.word), { headers: noStore });
  } catch (cause) {
    return failure(cause);
  }
};
