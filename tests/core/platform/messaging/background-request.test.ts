import { describe, expect, it, vi } from 'vitest';
import { backgroundErrorMessage, readFromBackground } from '../../../../src/core/platform/messaging/background-request';

describe('background read recovery', () => {
  it('retries a disconnected read once', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('The message port closed before a response was received.')).mockResolvedValueOnce({ ready: true });
    await expect(readFromBackground(request)).resolves.toEqual({ ready: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not loop when the background is stale or unavailable', async () => {
    const error = new Error('Could not establish connection. Receiving end does not exist.');
    const request = vi.fn().mockRejectedValue(error);
    await expect(readFromBackground(request)).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(2);
    expect(backgroundErrorMessage(error, 'Failed')).toContain('Reload the extension');
  });

  it('does not retry NAS errors or replace their useful messages', async () => {
    const error = new Error('A Download Station administrator account is required.');
    const request = vi.fn().mockRejectedValue(error);
    await expect(readFromBackground(request)).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(1);
    expect(backgroundErrorMessage(error, 'Failed')).toBe(error.message);
  });
});
