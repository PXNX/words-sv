// Whether the device is online, for the few things that need the network (Telegram sign-in, the
// store, group games, Edge voices, first model downloads); everything else works offline.
export const network = $state<{ online: boolean }>({ online: typeof navigator === 'undefined' ? true : navigator.onLine });

let watching = false;
export function watchNetwork() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  window.addEventListener('online', () => (network.online = true));
  window.addEventListener('offline', () => (network.online = false));
}
