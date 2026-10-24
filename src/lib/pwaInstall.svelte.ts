export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISSED_KEY = 'wordcircle-install-hint-dismissed-v1';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const displayMode = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(displayMode || iosStandalone);
}

/**
 * One shared source of truth for the browser's install offer. The event fires once, usually early
 * in the page lifecycle, so it has to be caught outside the home screen and kept until the learner
 * either accepts it or hides the little prompt.
 */
class PwaInstallStore {
  deferredPrompt = $state<InstallPromptEvent | null>(null);
  installed = $state(false);
  dismissed = $state(false);
  started = false;

  get canInstall() {
    return this.deferredPrompt !== null && !this.installed && !this.dismissed;
  }

  init() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.installed = isStandalone();
    try {
      this.dismissed = localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      // Storage is optional; the prompt still works for this page view.
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event as InstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.installed = true;
      this.deferredPrompt = null;
    });
  }

  async install() {
    const event = this.deferredPrompt;
    if (!event || this.installed) return false;
    this.deferredPrompt = null;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      return choice.outcome === 'accepted';
    } catch {
      return false;
    }
  }

  dismiss() {
    this.dismissed = true;
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage is optional.
    }
  }
}

export const pwaInstall = new PwaInstallStore();
