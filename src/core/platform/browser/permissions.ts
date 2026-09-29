import { browser } from 'wxt/browser';
import { hostPermissionPattern } from './host-permission-pattern';

export const PermissionsManager = {
  async hasHostPermission(url: string): Promise<boolean> {
    try {
      const origin = hostPermissionPattern(url);
      const hasSpecific = await browser.permissions.contains({
        origins: [origin],
      });
      if (hasSpecific) return true;

      return await browser.permissions
        .contains({
          origins: ['*://*/*'],
        })
        .catch(() => false);
    } catch {
      return false;
    }
  },

  async requestHostPermission(url: string): Promise<boolean> {
    try {
      const origin = hostPermissionPattern(url);
      return await browser.permissions.request({
        origins: [origin],
      });
    } catch {
      return false;
    }
  },

  /** Request selected origins together, while the click gesture is still active. */
  async requestHostPermissions(urls: string[]): Promise<boolean> {
    try {
      const origins = [...new Set(urls.map(url => hostPermissionPattern(url)))];
      if (!origins.length) return true;
      try {
        return await browser.permissions.request({ origins });
      } catch {
        // Background handlers may have lost their gesture; an existing grant
        // remains valid. Never silently grant access to any other host.
        return await browser.permissions.contains({ origins });
      }
    } catch {
      return false;
    }
  },

  async removeHostPermission(url: string): Promise<boolean> {
    try {
      const origin = hostPermissionPattern(url);
      return await browser.permissions.remove({
        origins: [origin],
      });
    } catch {
      return false;
    }
  },
};
