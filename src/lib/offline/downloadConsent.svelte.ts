/*
 * Asks before a large download on mobile data. Callers await `confirmDownload(size, name)`; on
 * Wi-Fi (or when the browser cannot tell) it resolves to true at once, otherwise
 * MobileDataDialog.svelte asks. Saying yes once covers the rest of the session.
 */
import { currentConnection, meteredReason, type MeteredReason } from './meteredConnection.js';

type Pending = { megabytes: number; name: string; reason: MeteredReason; resolve: (allowed: boolean) => void };

export const downloadConsent = $state<{ pending: Pending | null }>({ pending: null });
let allowedThisSession = false;

export function confirmDownload(megabytes: number, name: string): Promise<boolean> {
  const reason = meteredReason(currentConnection());
  if (!reason || allowedThisSession) return Promise.resolve(true);
  downloadConsent.pending?.resolve(false);
  return new Promise((resolve) => {
    downloadConsent.pending = { megabytes, name, reason, resolve };
  });
}

export function answerDownload(allowed: boolean) {
  const pending = downloadConsent.pending;
  if (!pending) return;
  if (allowed) allowedThisSession = true;
  downloadConsent.pending = null;
  pending.resolve(allowed);
}
