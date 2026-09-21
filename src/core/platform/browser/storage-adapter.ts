import { browser } from 'wxt/browser';

interface StorageAreaWithAccessLevel {
  setAccessLevel?: (options: { accessLevel: 'TRUSTED_CONTEXTS' } | 'TRUSTED_CONTEXTS') => Promise<void>;
}

export async function restrictStorageToTrustedContexts(): Promise<void> {
  try {
    if (typeof browser === 'undefined') return;

    // Local storage
    if (browser.storage && browser.storage.local) {
      const local = browser.storage.local as unknown as StorageAreaWithAccessLevel;
      if (typeof local.setAccessLevel === 'function') {
        try {
          // Chromium signature
          await local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
        } catch {
          try {
            // WebExtensions / Firefox signature fallback
            await local.setAccessLevel('TRUSTED_CONTEXTS');
          } catch (e: unknown) {
            if (e && typeof e === 'object' && 'name' in e && e.name === 'MockNotImplementedError') {
              // Ignore in test environments
            } else {
              console.warn('[R22E] Failed to restrict local storage access level', e);
            }
          }
        }
      }
    }

    // Session storage
    if (browser.storage && browser.storage.session) {
      const session = browser.storage.session as unknown as StorageAreaWithAccessLevel;
      if (typeof session.setAccessLevel === 'function') {
        try {
          await session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
        } catch {
          try {
            await session.setAccessLevel('TRUSTED_CONTEXTS');
          } catch (e: unknown) {
            if (e && typeof e === 'object' && 'name' in e && e.name === 'MockNotImplementedError') {
              // Ignore in test environments
            } else {
              console.warn('[R22E] Failed to restrict session storage access level', e);
            }
          }
        }
      }
    }
  } catch {
    // Ignore global errors to prevent blocking extension startup
  }
}
