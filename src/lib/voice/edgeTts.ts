/*
 * Microsoft Edge TTS — free, no API key, 19+ languages including German.
 *
 * Edge's "read aloud" calls a WebSocket service at speech.platform.bing.com that is free for
 * anyone to use. This module speaks to that service directly from the browser: it opens a
 * WebSocket, sends the SSML, and streams back MP3 chunks, which are concatenated into one blob.
 * The voices are Microsoft's own neural voices (e.g. "de-DE-KatjaNeural", "de-DE-ConradNeural")
 * and are picked by the story cast from a list fetched once and cached.
 *
 * Nothing is uploaded anywhere; the audio is synthesized in the browser and played locally.
 * The service is free but has no SLA — if Microsoft changes it, the story falls back to the
 * browser's own speechSynthesis (see StoryMode.svelte).
 */
const WS_URL = 'wss://speech.platform.bing.com/speech/synthesize/context';
const VOICE_LIST_URL = 'https://speech.platform.bing.com/speech/voices/list';

let cachedVoices: { voiceId: string; language: string; gender: string; name: string }[] | null = null;

function uuid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ssml(text: string, voice: string, rate: number) {
  const ratePct = Math.round((rate - 1) * 100);
  return `<?xml version="1.0" encoding="UTF-8"?><speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE"><voice name="${voice}"><prosody rate="${ratePct >= 0 ? '+' : ''}${ratePct}%">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody></voice></speak>`;
}

/** Fetches Microsoft's voice list once and caches it. */
export async function listEdgeVoices(): Promise<{ voiceId: string; language: string; gender: string; name: string }[]> {
  if (cachedVoices) return cachedVoices;
  const response = await fetch(VOICE_LIST_URL);
  if (!response.ok) throw new Error(`Edge voices: ${response.status}`);
  const data = await response.json();
  cachedVoices = data.map((voice: { VoiceName: string; ShortName: string; Gender: string; Locale: string }) => ({
    voiceId: voice.ShortName,
    language: voice.Locale,
    gender: voice.Gender,
    name: voice.VoiceName
  }));
  return cachedVoices;
}

export type EdgeClip = { blob: Blob; duration: number };

/** Synthesizes text to an MP3 blob via the Edge TTS WebSocket. */
export async function speakEdge(text: string, voiceId: string, rate = 1): Promise<EdgeClip> {
  return new Promise<EdgeClip>((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const audioChunks: BlobPart[] = [];
    let settled = false;
    const timer = window.setTimeout(() => finish(new Error('Edge TTS timed out')), 30000);

    function finish(error: Error | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (error) return reject(error);
      const blob = new Blob(audioChunks, { type: 'audio/mpeg' });
      resolve({ blob, duration: 0 });
    }

    ws.onopen = () => {
      const config = 'Content-Type:application/json; charset=utf-8\r\n\r\n';
      const ssmlText = ssml(text, voiceId, rate);
      const request = `X-Timestamp:${new Date().toUTCString()}\r\nX-RequestId:${uuid()}\r\nPath:synthesize\r\n\r\n`;
      ws.send(config + request + ssmlText);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') return;
      audioChunks.push(event.data);
    };

    ws.onclose = () => finish(null);
    ws.onerror = () => finish(new Error('Edge TTS connection failed'));
  });
}

/** Decodes an MP3 blob into seconds using the browser's audio engine. */
export async function blobDuration(blob: Blob): Promise<number> {
  if (typeof window === 'undefined' || !('Audio' in window)) return 0;
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', () => resolve(isFinite(audio.duration) ? audio.duration : 0));
      audio.addEventListener('error', () => reject(new Error('audio decode failed')));
      audio.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}