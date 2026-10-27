/*
 * Microsoft Edge TTS — free, no API key, Microsoft's neural voices (e.g. "de-DE-KatjaNeural").
 *
 * Edge's "read aloud" uses a WebSocket service at speech.platform.bing.com. This module speaks the
 * same protocol from the browser: it sends a speech.config message and the SSML, then collects the
 * MP3 frames until the service reports `turn.end`. Every binary frame starts with a two-byte header
 * length and a text header, which are stripped before the audio is kept.
 *
 * The service is free but has no SLA, and it may refuse connections that don't come from Edge
 * itself (it answered 403 while this was written). A failed request rejects, and the story falls
 * back to the browser's own speechSynthesis (see StoryMode.svelte).
 */
const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const GEC_VERSION = '1-143.0.3650.75';
const WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const VOICE_LIST_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${TOKEN}`;
// Windows file time (100 ns ticks since 1601) of the start of this five-minute window.
const WINDOWS_EPOCH_OFFSET = 11644473600;

export type EdgeVoice = { voiceId: string; locale: string; gender: 'female' | 'male' };

let cachedVoices: Promise<EdgeVoice[]> | null = null;

function connectionId() {
  return crypto.randomUUID().replaceAll('-', '');
}

// The service expects a hash of the current five-minute window and the public token.
async function secMsGec() {
  let seconds = Math.floor(Date.now() / 1000) + WINDOWS_EPOCH_OFFSET;
  seconds -= seconds % 300;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${BigInt(seconds) * 10_000_000n}${TOKEN}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function escapeXml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function percent(factor: number) {
  const value = Math.round((factor - 1) * 100);
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function ssml(text: string, voice: EdgeVoice, rate: number, pitch: number) {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voice.locale}'><voice name='${voice.voiceId}'><prosody pitch='${percent(pitch)}' rate='${percent(rate)}' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`;
}

/** Fetches Microsoft's voice list once and caches it. */
export function listEdgeVoices(): Promise<EdgeVoice[]> {
  cachedVoices ??= fetch(VOICE_LIST_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Edge voices: ${response.status}`);
      return response.json() as Promise<{ ShortName: string; Gender: string; Locale: string }[]>;
    })
    .then((voices) => voices.map((voice) => ({ voiceId: voice.ShortName, locale: voice.Locale, gender: voice.Gender === 'Male' ? 'male' as const : 'female' as const })));
  void cachedVoices.catch(() => (cachedVoices = null));
  return cachedVoices;
}

/** Synthesizes text to MP3 bytes. `rate` and `pitch` are factors around 1. */
export async function speakEdge(text: string, voice: EdgeVoice, rate = 1, pitch = 1): Promise<ArrayBuffer> {
  const url = `${WS_URL}?TrustedClientToken=${TOKEN}&Sec-MS-GEC=${await secMsGec()}&Sec-MS-GEC-Version=${GEC_VERSION}&ConnectionId=${connectionId()}`;
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    const chunks: Uint8Array[] = [];
    let settled = false;
    const timer = window.setTimeout(() => finish(new Error('Edge TTS timed out')), 30000);

    function finish(error: Error | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* already closed */ }
      if (error) return reject(error);
      const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      if (!size) return reject(new Error('Edge TTS returned no audio'));
      const audio = new Uint8Array(size);
      let at = 0;
      for (const chunk of chunks) {
        audio.set(chunk, at);
        at += chunk.length;
      }
      resolve(audio.buffer);
    }

    ws.onopen = () => {
      const timestamp = new Date().toString();
      ws.send(`X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
      ws.send(`X-RequestId:${connectionId()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml(text, voice, rate, pitch)}`);
    };
    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) finish(null);
        return;
      }
      const frame = new Uint8Array(event.data as ArrayBuffer);
      const headerLength = (frame[0] << 8) | frame[1];
      chunks.push(frame.subarray(2 + headerLength));
    };
    ws.onclose = () => finish(new Error('Edge TTS closed the connection'));
    ws.onerror = () => finish(new Error('Edge TTS connection failed'));
  });
}
