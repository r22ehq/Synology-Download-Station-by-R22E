import { describe, it, expect, vi } from 'vitest';
import { parseSynoResponse } from '@/core/synology/transport/response-parser';
import { SynoError } from '@/core/synology/types';

/** Helper to create a mock Response with JSON body. */
function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as Response;
}

describe('parseSynoResponse', () => {
  it('unwraps successful response data', async () => {
    const data = { tasks: [], total: 0 };
    const response = mockResponse({ success: true, data });
    const result = await parseSynoResponse<typeof data>(response);
    expect(result).toEqual(data);
  });

  it('throws SynoError on error response', async () => {
    const response = mockResponse({ success: false, error: { code: 105 } });
    await expect(parseSynoResponse(response)).rejects.toThrow(SynoError);
  });

  it('includes error code in SynoError', async () => {
    const response = mockResponse({ success: false, error: { code: 403 } });
    try {
      await parseSynoResponse(response);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SynoError);
      expect((err as SynoError).code).toBe(403);
    }
  });

  it('throws on non-200 HTTP status', async () => {
    const response = mockResponse({}, 500);
    await expect(parseSynoResponse(response)).rejects.toThrow('HTTP Error');
  });

  it('throws on non-JSON response', async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      headers: new Headers(),
    } as unknown as Response;
    await expect(parseSynoResponse(response)).rejects.toThrow('Failed to parse');
  });

  it('throws on invalid envelope (missing success field)', async () => {
    const response = mockResponse({ data: 'invalid' });
    await expect(parseSynoResponse(response)).rejects.toThrow('Invalid response envelope');
  });
});
