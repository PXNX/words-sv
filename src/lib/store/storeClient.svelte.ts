// The store on this device: what the signed-in Telegram account owns (items unlock as cosmetics,
// Pro's end date goes to the streak), and buying with Telegram Stars. In the Mini App the invoice
// opens in place; elsewhere as a Telegram link, and the page checks back until the payment arrived.
import * as v from 'valibot';
import { callApi } from '#lib/api/client.js';
import { deviceId, readProUntil, writeProUntil } from '#lib/streak/clientStreak.js';
import { unlockCosmetic } from '#lib/profile/cosmetics.svelte.js';
import { openTelegramLink } from '#lib/settings/telegramClient.js';
import { settings } from '#lib/state/settings.svelte.js';
import { ownedItems, type ProductId } from './catalog.js';

const StatusSchema = v.object({ ok: v.literal(true), linked: v.boolean(), bought: v.array(v.string()), proUntil: v.nullable(v.number()) });
const InvoiceSchema = v.object({ ok: v.literal(true), url: v.optional(v.string()), linked: v.optional(v.boolean()) });

export const storeState = $state<{ linked: boolean | null; bought: string[]; proUntil: number | null; loading: boolean; buying: ProductId | null; failed: boolean }>({
  linked: null,
  bought: [],
  proUntil: typeof localStorage === 'undefined' ? null : readProUntil(),
  loading: false,
  buying: null,
  failed: false
});

/** Asks what the account owns; unlocks the items and remembers Pro for the streak. */
export async function refreshStore(): Promise<void> {
  if (import.meta.env?.DEV) return;
  storeState.loading = true;
  try {
    const status = await callApi('/api/store', StatusSchema, { body: { deviceId: deviceId(), action: 'status' } });
    storeState.linked = status.linked;
    storeState.bought = status.bought;
    storeState.proUntil = status.proUntil;
    storeState.failed = false;
    writeProUntil(status.proUntil);
    for (const item of ownedItems(status.bought)) unlockCosmetic(item);
  } catch {
    storeState.failed = true;
  } finally {
    storeState.loading = false;
  }
}

type WebAppInvoice = { openInvoice?: (url: string, callback: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void };

const CHECK_EVERY_MS = 3000;
const CHECK_FOR_MS = 3 * 60 * 1000;

/** Opens the Stars invoice for `product`; resolves once it was paid (true) or given up on (false). */
export async function buy(product: ProductId): Promise<boolean> {
  storeState.buying = product;
  try {
    const invoice = await callApi('/api/store', InvoiceSchema, { body: { deviceId: deviceId(), action: 'invoice', product, locale: settings.interfaceLocale } });
    if (!invoice.url) {
      storeState.linked = false;
      return false;
    }
    const webApp = (window as { Telegram?: { WebApp?: WebAppInvoice } }).Telegram?.WebApp;
    if (webApp?.openInvoice) {
      const status = await new Promise<string>((resolve) => webApp.openInvoice!(invoice.url!, resolve));
      if (status === 'cancelled' || status === 'failed') return false;
    } else {
      openTelegramLink(invoice.url);
    }
    // The bot records the payment on the server a moment after Telegram confirms it.
    const before = JSON.stringify([storeState.bought, storeState.proUntil]);
    for (const until = Date.now() + CHECK_FOR_MS; Date.now() < until;) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS));
      if (document.visibilityState === 'hidden') continue;
      await refreshStore();
      if (JSON.stringify([storeState.bought, storeState.proUntil]) !== before) return true;
    }
    return false;
  } catch {
    storeState.failed = true;
    return false;
  } finally {
    storeState.buying = null;
  }
}
