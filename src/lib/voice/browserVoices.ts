/*
 * Whether this browser can speak with its own voice, which is what the `standard` engine uses.
 * Some webviews expose `speechSynthesis` and `SpeechSynthesisUtterance` without a single voice —
 * Telegram's Mini App in a QtWebEngine or Android WebView among them — so every utterance stays
 * silent and no error is raised. `voice/engines.ts` reads the answer and moves the `standard`
 * engine to a rendered one, which sounds the same everywhere.
 *
 * The voice list loads asynchronously in Chrome and Safari, so an empty one is only an answer once
 * the list has had time to arrive; `watchBrowserVoices` waits a moment and keeps listening, so
 * voices that are installed (or uninstalled) later are picked up too.
 */

const GRACE_MS = 1500;

function synthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return null;
  return window.speechSynthesis;
}

/** The browser can speak right now: the API is there and at least one voice is listed. */
export function browserVoicesReady(): boolean {
  try {
    return Boolean(synthesis()?.getVoices().length);
  } catch {
    // A webview that refuses to answer at all has nothing to speak with.
    return false;
  }
}

/**
 * Reports whether the browser's own voices can speak, once the list has had time to load and again
 * whenever it changes. Returns the unsubscribe function.
 */
export function watchBrowserVoices(report: (usable: boolean) => void): () => void {
  const synthesisVoices = synthesis();
  if (!synthesisVoices) {
    report(false);
    return () => {};
  }
  let reported: boolean | null = null;
  const check = () => {
    const usable = browserVoicesReady();
    if (usable === reported) return;
    reported = usable;
    report(usable);
  };
  // Voices that are already listed answer at once; an empty list may still be loading.
  if (browserVoicesReady()) check();
  const grace = window.setTimeout(check, GRACE_MS);
  synthesisVoices.addEventListener('voiceschanged', check);
  return () => {
    window.clearTimeout(grace);
    synthesisVoices.removeEventListener('voiceschanged', check);
  };
}
