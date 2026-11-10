import { describe, expect, it } from 'vitest';
import { installShare } from '../src/lib/pwa/pwaUpdate';

describe('update progress', () => {
  it('reads the service worker install progress', () => {
    expect(installShare({ type: 'INSTALL_PROGRESS', done: 40, total: 160 })).toBe(0.25);
    expect(installShare({ type: 'INSTALL_PROGRESS', done: 200, total: 160 })).toBe(1);
    expect(installShare({ type: 'INSTALL_PROGRESS', done: 1, total: 0 })).toBeNull();
    expect(installShare({ type: 'CHECK_REMINDERS' })).toBeNull();
    expect(installShare(null)).toBeNull();
  });
});
