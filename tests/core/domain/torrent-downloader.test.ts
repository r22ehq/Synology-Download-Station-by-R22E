import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TorrentDownloader } from '../../../src/core/domain/torrent-downloader';

describe('TorrentDownloader', () => {
  let downloader: TorrentDownloader;

  beforeEach(() => {
    downloader = new TorrentDownloader();
    globalThis.fetch = vi.fn();
  });

  const createMockResponse = (
    ok: boolean,
    status: number,
    statusText: string,
    url: string,
    headers: Record<string, string>,
    body: Uint8Array
  ) => {
    return {
      ok,
      status,
      statusText,
      url,
      headers: {
        get: (name: string) => headers[name.toLowerCase()] || null,
      },
      blob: async () => ({
        arrayBuffer: async () => body.buffer,
      }),
    } as unknown as Response;
  };

  it('should successfully fetch and validate a torrent file', async () => {
    // Valid torrent starts with 'd' (0x64)
    const validBytes = new Uint8Array([0x64, 0x38, 0x3a, 0x61, 0x6e, 0x6e, 0x6f]);
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse(true, 200, 'OK', 'https://tracker.com/file.torrent', { 'content-type': 'application/x-bittorrent' }, validBytes)
    );

    const result = await downloader.fetchTorrent('https://tracker.com/file.torrent');
    expect(result.fileName).toBe('file.torrent');
    expect(result.file.type).toBe('application/x-bittorrent');
  });

  it('should throw if redirected to a login page', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse(true, 200, 'OK', 'https://tracker.com/login.php', { 'content-type': 'text/html' }, new Uint8Array())
    );

    await expect(downloader.fetchTorrent('https://tracker.com/file.torrent'))
      .rejects.toThrow('Redirected to login page. Tracker session may have expired.');
  });

  it('should throw if HTML is returned', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse(true, 200, 'OK', 'https://tracker.com/file.torrent', { 'content-type': 'text/html; charset=utf-8' }, new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e])) // <html>
    );

    await expect(downloader.fetchTorrent('https://tracker.com/file.torrent'))
      .rejects.toThrow('Received HTML instead of a torrent file');
  });

  it('should throw if magic bytes are invalid', async () => {
    // Invalid magic bytes (e.g. an exe file)
    const invalidBytes = new Uint8Array([0x4d, 0x5a]);
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse(true, 200, 'OK', 'https://tracker.com/file.torrent', { 'content-type': 'application/octet-stream' }, invalidBytes)
    );

    await expect(downloader.fetchTorrent('https://tracker.com/file.torrent'))
      .rejects.toThrow('Invalid torrent file format');
  });

  it('should throw on network error or 404', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse(false, 404, 'Not Found', 'https://tracker.com/file.torrent', {}, new Uint8Array())
    );

    await expect(downloader.fetchTorrent('https://tracker.com/file.torrent'))
      .rejects.toThrow('Failed to fetch torrent: 404 Not Found');
  });
});
