import { afterEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { showPageToast } from '../../../../src/core/platform/browser/page-toast';

vi.mock('wxt/browser', () => ({ browser: { scripting: { executeScript: vi.fn(async () => []) } } }));

describe('page download toast', () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.getElementById('r22e-page-toast')?.remove();
  });

  it('injects a top-right acknowledgement for a successful context-menu download', async () => {
    await showPageToast(7, 'https://example.com/files/movie.mp4?token=private', true);
    expect(browser.scripting.executeScript).toHaveBeenCalledTimes(1);
    const script = vi.mocked(browser.scripting.executeScript).mock.calls[0]?.[0];
    expect(script?.target).toEqual({ tabId: 7 });
    if (!script || !('args' in script) || !script.func) throw new Error('Missing injected function');
    expect(script.args).toEqual(['movie.mp4', true]);
    (script.func as (name: string, added: boolean) => void)('movie.mp4', true);
    const host = document.getElementById('r22e-page-toast');
    expect(host?.style.top).toBe('16px');
    expect(host?.style.right).toBe('16px');
    expect(host?.dir).toBe('ltr');
    expect(host?.shadowRoot).toBeNull();
  });

  it('does not attempt injection when no page tab exists', async () => {
    await showPageToast(undefined, 'https://example.com/file.zip', true);
    expect(browser.scripting.executeScript).not.toHaveBeenCalled();
  });
});
