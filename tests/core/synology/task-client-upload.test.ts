import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskClient } from '../../../src/core/synology/download-station/task-client';
import { SynoHttpClient } from '../../../src/core/synology/transport/http-client';
import { ApiRegistry } from '../../../src/core/synology/api-discovery/api-registry';

describe('TaskClient (Upload)', () => {
  let httpClient: SynoHttpClient;
  let taskClient: TaskClient;
  let registry: ApiRegistry;

  beforeEach(() => {
    httpClient = new SynoHttpClient();
    taskClient = new TaskClient(httpClient);
    registry = new ApiRegistry('http://nas');
    registry.register('SYNO.DownloadStation.Task', { path: 'DownloadStation/task.cgi', minVersion: 1, maxVersion: 3 });
  });

  it('should construct FormData when uploading a valid .torrent file', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue([]);
    
    // Create a mock file
    const file = new File(['d8:announce...'], 'ubuntu.torrent', { type: 'application/x-bittorrent' });
    
    await taskClient.create('http://nas', registry, 'sid-123', { file, destination: '/downloads' });
    
    expect(postSpy).toHaveBeenCalled();
    const config = postSpy.mock.calls[0]?.[2] as any;
    expect(config).toBeInstanceOf(FormData);
    expect(config.get('file').name).toBe('ubuntu.torrent');
    expect(config.get('destination')).toBe('/downloads');
  });

  it('should handle API error codes gracefully (e.g., file not exist or session expiration)', async () => {
    vi.spyOn(httpClient, 'post').mockRejectedValue(new Error('Task action failed (Error 401)'));
    
    const file = new File(['d8:announce...'], 'ubuntu.torrent', { type: 'application/x-bittorrent' });
    
    await expect(taskClient.create('http://nas', registry, 'sid-123', { file })).rejects.toThrow('Task action failed (Error 401)');
  });
});
