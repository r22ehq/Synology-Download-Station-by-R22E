import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionsManager } from '../../../../src/core/platform/browser/permissions';
import { browser } from 'wxt/browser';

vi.mock('wxt/browser', () => ({
  browser: {
    permissions: {
      contains: vi.fn(),
      request: vi.fn(),
      remove: vi.fn(),
    },
  },
}));

describe('PermissionsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check if host permission is granted', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(true);
    const result = await PermissionsManager.hasHostPermission('https://tracker.com/file.torrent');
    expect(result).toBe(true);
    expect(browser.permissions.contains).toHaveBeenCalledWith({ origins: ['https://tracker.com/*'] });
  });

  it('should request host permission successfully', async () => {
    vi.mocked(browser.permissions.request as any).mockResolvedValue(true);
    const result = await PermissionsManager.requestHostPermission('https://tracker.com/file.torrent');
    expect(result).toBe(true);
    expect(browser.permissions.request).toHaveBeenCalledWith({ origins: ['https://tracker.com/*'] });
  });

  it('should handle permission denial gracefully', async () => {
    vi.mocked(browser.permissions.request as any).mockResolvedValue(false);
    const result = await PermissionsManager.requestHostPermission('https://tracker.com/file.torrent');
    expect(result).toBe(false);
  });

  it('should handle api errors gracefully', async () => {
    vi.mocked(browser.permissions.request as any).mockRejectedValue(new Error('Browser error'));
    const result = await PermissionsManager.requestHostPermission('https://tracker.com/file.torrent');
    expect(result).toBe(false);
  });
  
  it('should remove host permission', async () => {
    vi.mocked(browser.permissions.remove as any).mockResolvedValue(true);
    const result = await PermissionsManager.removeHostPermission('https://tracker.com/file.torrent');
    expect(result).toBe(true);
    expect(browser.permissions.remove).toHaveBeenCalledWith({ origins: ['https://tracker.com/*'] });
  });
});
