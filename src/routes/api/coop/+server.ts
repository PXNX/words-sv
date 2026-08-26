import { json, type RequestHandler } from '@sveltejs/kit';
import { createCoopRoom, CoopRoomError } from '$lib/server/coop';
import { isCoopRound, isParticipantId } from '$lib/coop';

const noStore = { 'cache-control': 'no-store' };

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: unknown = await request.json();
    const value = body as { round?: unknown; participantId?: unknown };
    if (!isCoopRound(value.round) || !isParticipantId(value.participantId)) return json({ error: 'invalid_request' }, { status: 400, headers: noStore });
    return json(await createCoopRoom(value.round, value.participantId), { status: 201, headers: noStore });
  } catch (cause) {
    if (cause instanceof CoopRoomError && cause.code === 'database_unavailable') return json({ error: cause.code }, { status: 503, headers: noStore });
    console.error('Unable to create co-op room', cause);
    return json({ error: 'room_unavailable' }, { status: 503, headers: noStore });
  }
};
