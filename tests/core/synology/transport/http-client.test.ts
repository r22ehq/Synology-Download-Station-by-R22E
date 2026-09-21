import { describe, it, expect, vi } from 'vitest';
import { SynoHttpClient } from '../../../../src/core/synology/transport/http-client';

describe('SynoHttpClient - SID Injection', () => {
  it('A. standard GET request includes _sid in query params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true })));
    const client = new SynoHttpClient();
    
    await client.get('http://nas', 'API/endpoint', { sid: 'my-sid' });
    
    const requestUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(requestUrl).toContain('_sid=my-sid');
  });

  it('B. standard POST request injects _sid into query URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true })));
    const client = new SynoHttpClient();
    
    const body = new URLSearchParams();
    await client.post('http://nas', 'API/endpoint', body, { sid: 'my-sid' });
    
    const requestUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(requestUrl).toContain('_sid=my-sid');
  });

  it('C. multipart torrent upload request has _sid in query URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true })));
    const client = new SynoHttpClient();
    
    const body = new FormData();
    await client.post('http://nas', 'API/endpoint', body, { sid: 'my-sid' });
    
    const requestUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(requestUrl).toContain('_sid=my-sid');
  });

  it('E. session-less login request must NOT receive an inappropriate SID', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true })));
    const client = new SynoHttpClient();
    
    await client.get('http://nas', 'auth.cgi');
    
    const requestUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(requestUrl).not.toContain('_sid=');
  });

  it('F. unpacks the data envelope and returns only the data on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ 
      success: true, 
      data: { tasks: [{ id: 'task-1' }] } 
    })));
    const client = new SynoHttpClient();
    
    const res = await client.get<{ tasks: any[] }>('http://nas', 'API/endpoint');
    
    expect(res).toBeDefined();
    expect(res.tasks).toBeDefined();
    expect(res.tasks[0].id).toBe('task-1');
    expect((res as any).success).toBeUndefined(); // success is unwrapped
  });

  it('G. throws a SynoError on success: false with correct error code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ 
      success: false, 
      error: { code: 403 } 
    })));
    const client = new SynoHttpClient();
    
    await expect(client.get('http://nas', 'API/endpoint')).rejects.toMatchObject({
      code: 403,
      message: 'Synology API Error: 403'
    });
  });

  it('H. timeout error redacts sensitive parameters', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      const err = new Error('Abort');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const client = new SynoHttpClient();
    
    await expect(client.get('http://nas', 'auth.cgi', { 
      sid: 'TEST_SID_DO_NOT_LEAK',
      params: { passwd: 'TEST_PASSWORD_DO_NOT_LEAK' } 
    })).rejects.toThrowError(/_sid=\[REDACTED\]/);
    
    await expect(client.get('http://nas', 'auth.cgi', { 
      sid: 'TEST_SID_DO_NOT_LEAK',
      params: { passwd: 'TEST_PASSWORD_DO_NOT_LEAK' } 
    })).rejects.not.toThrowError(/TEST_PASSWORD_DO_NOT_LEAK/);
  });
});
