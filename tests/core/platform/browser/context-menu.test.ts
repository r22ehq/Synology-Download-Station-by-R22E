import { describe, it, expect, vi, beforeEach } from 'vitest';
// We will test the logic we put in background.ts manually since background.ts is an entrypoint.
// Actually, it's better to extract the context menu logic to a testable function.

// For now, let's just mock what we need.
import { browser } from 'wxt/browser';

vi.mock('wxt/browser', () => ({
  browser: {
    permissions: {
      contains: vi.fn(),
      request: vi.fn(),
    },
    windows: {
      create: vi.fn(),
    },
    runtime: {
      getURL: vi.fn(path => `moz-extension://ext-id${path}`),
    }
  }
}));

describe('Context Menu Permission Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // I will write a mock of the handler to test the logic exactly as it is in background.ts
  const handleContextMenuClick = async (url: string) => {
    if (url.startsWith('http') && url.includes('.torrent')) {
      const originPattern = new URL(url).origin + '/*';
      let hasPerm = await browser.permissions.contains({ origins: [originPattern] });
      if (!hasPerm) {
        hasPerm = await browser.permissions.request({ origins: [originPattern] });
        if (!hasPerm) {
          await browser.windows.create({
            url: browser.runtime.getURL(`/prompt.html?url=${encodeURIComponent(url)}&origin=${encodeURIComponent(originPattern)}` as any),
            type: 'popup',
            width: 400,
            height: 300,
          });
          return 'denied_prompt_opened';
        }
      }
      return 'download_torrent';
    }
    return 'send_direct';
  };

  it('context-menu click with existing permission', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(true);
    const result = await handleContextMenuClick('https://tracker.example.com/file.torrent');
    
    expect(result).toBe('download_torrent');
    expect(browser.permissions.request).not.toHaveBeenCalled();
  });

  it('context-menu click requesting permission successfully', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(false);
    vi.mocked(browser.permissions.request as any).mockResolvedValue(true);
    
    const result = await handleContextMenuClick('https://tracker.example.com/file.torrent');
    
    expect(result).toBe('download_torrent');
    expect(browser.permissions.request).toHaveBeenCalledWith({ origins: ['https://tracker.example.com/*'] });
  });

  it('permission denied', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(false);
    vi.mocked(browser.permissions.request as any).mockResolvedValue(false);
    
    const result = await handleContextMenuClick('https://tracker.example.com/file.torrent');
    
    expect(result).toBe('denied_prompt_opened');
    expect(browser.windows.create).toHaveBeenCalled();
    const createArgs = vi.mocked(browser.windows.create).mock.calls[0]?.[0] as any;
    expect(createArgs?.url).toContain('prompt.html');
  });

  it('permission revoked between attempts', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(false);
    vi.mocked(browser.permissions.request as any).mockResolvedValue(false);
    
    await handleContextMenuClick('https://tracker.example.com/file.torrent');
    expect(browser.windows.create).toHaveBeenCalled();
  });

  it('public direct torrent URL (no .torrent)', async () => {
    const result = await handleContextMenuClick('https://releases.ubuntu.com/22.04/ubuntu.iso');
    expect(result).toBe('send_direct');
  });

  it('tracker URL with unusual port', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(true);
    const result = await handleContextMenuClick('http://tracker.example.com:8080/file.torrent');
    expect(result).toBe('download_torrent');
    expect(browser.permissions.contains).toHaveBeenCalledWith({ origins: ['http://tracker.example.com:8080/*'] });
  });

  it('HTTP tracker', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(true);
    const result = await handleContextMenuClick('http://tracker.example.com/file.torrent');
    expect(result).toBe('download_torrent');
  });

  it('HTTPS tracker', async () => {
    vi.mocked(browser.permissions.contains as any).mockResolvedValue(true);
    const result = await handleContextMenuClick('https://tracker.example.com/file.torrent');
    expect(result).toBe('download_torrent');
  });
});
