import { browser } from 'wxt/browser';

export const PermissionsManager = {
  async hasHostPermission(url: string): Promise<boolean> {
    try {
      const origin = new URL(url).origin + '/*';
      return await browser.permissions.contains({
        origins: [origin],
      });
    } catch {
      return false;
    }
  },

  async requestHostPermission(url: string): Promise<boolean> {
    try {
      const origin = new URL(url).origin + '/*';
      return await browser.permissions.request({
        origins: [origin],
      });
    } catch {
      return false;
    }
  },
  
  async removeHostPermission(url: string): Promise<boolean> {
    try {
      const origin = new URL(url).origin + '/*';
      return await browser.permissions.remove({
        origins: [origin],
      });
    } catch {
      return false;
    }
  }
};
