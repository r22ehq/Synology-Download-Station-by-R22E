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
});
