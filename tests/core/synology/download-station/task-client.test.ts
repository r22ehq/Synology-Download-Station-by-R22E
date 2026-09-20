import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskClient } from '../../../../src/core/synology/download-station/task-client';
import type { SynoHttpClient } from '../../../../src/core/synology/transport/http-client';
import type { ApiRegistry } from '../../../../src/core/synology/api-discovery/api-registry';

describe('TaskClient', () => {
  let httpClientMock: ReturnType<typeof vi.fn> & Partial<SynoHttpClient>;
  let registryMock: ReturnType<typeof vi.fn> & Partial<ApiRegistry>;
  let client: TaskClient;

  const baseUrl = 'http://synology:5000';
  const sid = 'test-sid';
  const synoToken = 'test-token';

  beforeEach(() => {
    httpClientMock = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn> & Partial<SynoHttpClient>;

    registryMock = {
      getNegotiatedVersion: vi.fn().mockReturnValue(1),
      resolveEndpoint: vi.fn().mockReturnValue('/webapi/DownloadStation/task.cgi'),
    } as unknown as ReturnType<typeof vi.fn> & Partial<ApiRegistry>;

    client = new TaskClient(httpClientMock as unknown as SynoHttpClient);
  });

  it('list() should construct correct params and parse response', async () => {
    const mockResponse = { tasks: [], total: 0, offset: 0 };
    (httpClientMock.get as any).mockResolvedValue(mockResponse);

    const result = await client.list(baseUrl, registryMock as unknown as ApiRegistry, sid, { limit: 10, offset: 5 }, { synoToken });

    expect(registryMock.getNegotiatedVersion).toHaveBeenCalledWith('SYNO.DownloadStation.Task', 2);
    expect(registryMock.resolveEndpoint).toHaveBeenCalledWith('SYNO.DownloadStation.Task');
    expect(httpClientMock.get).toHaveBeenCalledWith(
      baseUrl,
      '/webapi/DownloadStation/task.cgi',
      {
        sid,
        synoToken,
        params: {
          api: 'SYNO.DownloadStation.Task',
          version: '1',
          method: 'list',
          limit: '10',
          offset: '5',
        }
      }
    );
    expect(result).toBe(mockResponse);
  });

  it('create() with URI constructs correct params and calls post', async () => {
    (httpClientMock.post as any).mockResolvedValue(undefined);

    await client.create(baseUrl, registryMock as unknown as ApiRegistry, sid, { uri: ['http://example.com/file.zip'], destination: 'Downloads' }, { synoToken });

    expect(httpClientMock.post).toHaveBeenCalledTimes(1);
    const args = (httpClientMock.post as any).mock.calls[0];
    expect(args[0]).toBe(baseUrl);
    expect(args[1]).toBe('/webapi/DownloadStation/task.cgi');
    
    // Check URLSearchParams body
    const body = args[2] as URLSearchParams;
    expect(body.get('api')).toBe('SYNO.DownloadStation.Task');
    expect(body.get('method')).toBe('create');
    expect(body.get('uri')).toBe('http://example.com/file.zip');
    expect(body.get('destination')).toBe('Downloads');
    
    expect(args[3]).toEqual({ sid, synoToken });
  });

  it('create() with file constructs correct FormData and calls post', async () => {
    (httpClientMock.post as any).mockResolvedValue(undefined);

    const blob = new Blob(['test content']);
    await client.create(baseUrl, registryMock as unknown as ApiRegistry, sid, { file: blob, destination: 'Downloads' }, { synoToken });

    expect(httpClientMock.post).toHaveBeenCalledTimes(1);
    const args = (httpClientMock.post as any).mock.calls[0];
    expect(args[0]).toBe(baseUrl);
    expect(args[1]).toBe('/webapi/DownloadStation/task.cgi');
    
    // Check FormData body
    const body = args[2] as FormData;
    expect(body.get('api')).toBe('SYNO.DownloadStation.Task');
    expect(body.get('method')).toBe('create');
    expect(body.get('destination')).toBe('Downloads');
    expect(body.get('file')).toBeInstanceOf(Blob);
    
    expect(args[3]).toEqual({ sid, synoToken });
  });

  it('pause() encodes task IDs correctly', async () => {
    const mockResponse = [{ id: 'dbid_1', error: 0 }];
    (httpClientMock.post as any).mockResolvedValue(mockResponse);

    await client.pause(baseUrl, registryMock as unknown as ApiRegistry, sid, ['dbid_1', 'dbid_2'], { synoToken });

    const args = (httpClientMock.post as any).mock.calls[0];
    const body = args[2] as URLSearchParams;
    expect(body.get('method')).toBe('pause');
    expect(body.get('id')).toBe('dbid_1,dbid_2');
  });

  it('resume() encodes task IDs correctly', async () => {
    const mockResponse = [{ id: 'dbid_1', error: 0 }];
    (httpClientMock.post as any).mockResolvedValue(mockResponse);

    await client.resume(baseUrl, registryMock as unknown as ApiRegistry, sid, ['dbid_1', 'dbid_2'], { synoToken });

    const args = (httpClientMock.post as any).mock.calls[0];
    const body = args[2] as URLSearchParams;
    expect(body.get('method')).toBe('resume');
    expect(body.get('id')).toBe('dbid_1,dbid_2');
  });

  it('delete() encodes task IDs correctly', async () => {
    const mockResponse = [{ id: 'dbid_1', error: 0 }];
    (httpClientMock.post as any).mockResolvedValue(mockResponse);

    await client.delete(baseUrl, registryMock as unknown as ApiRegistry, sid, ['dbid_1', 'dbid_2'], true, { synoToken });

    const args = (httpClientMock.post as any).mock.calls[0];
    const body = args[2] as URLSearchParams;
    expect(body.get('method')).toBe('delete');
    expect(body.get('id')).toBe('dbid_1,dbid_2');
    expect(body.get('force_complete')).toBe('true');
  });
});
