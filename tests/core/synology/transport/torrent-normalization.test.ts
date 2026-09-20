import { describe, it, expect, vi } from 'vitest';
import { TaskClient } from '../../../../src/core/synology/download-station/task-client';
import { SynoHttpClient } from '../../../../src/core/synology/transport/http-client';
import { ApiRegistry } from '../../../../src/core/synology/api-discovery/api-registry';

describe('Torrent Normalization', () => {
  it('preserves bytes but sanitizes invalid names for DSM 7 multipart', async () => {
    const postSpy = vi.fn().mockResolvedValue({ success: true });
    const httpClient = { post: postSpy } as unknown as SynoHttpClient;
    const registry = new ApiRegistry('http://nas');
    registry.register('SYNO.DownloadStation.Task', { path: 'api', minVersion: 1, maxVersion: 2 });
    
    const client = new TaskClient(httpClient);

    // Provide a file with path traversal
    const file = new File(['torrent bytes'], '../../evil.torrent', { type: 'application/x-bittorrent' });
    
    await client.create('http://nas', registry, 'sid-123', { file });
    
    const formData = postSpy.mock.calls[0]![2] as FormData;
    const fileArg = formData.get('file') as File;
    
    expect(fileArg.name).toBe('.._.._evil.torrent'); // Extracted and replaced invalid chars
  });
});
