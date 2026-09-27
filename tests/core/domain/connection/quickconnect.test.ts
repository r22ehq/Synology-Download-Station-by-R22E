import { describe, expect, it, vi } from 'vitest';
import { directQuickConnectEndpoints, discoverQuickConnectEndpoints, normalizeQuickConnectId } from '@/core/domain/connection/quickconnect';

describe('experimental QuickConnect direct discovery', () => {
  it('accepts an ID, not an arbitrary URL', () => {
    expect(normalizeQuickConnectId(' Home-NAS ')).toBe('Home-NAS');
    expect(() => normalizeQuickConnectId('https://example.com')).toThrow(/valid QuickConnect ID/);
  });

  it('keeps only HTTPS hosts under the requested ID domain', () => {
    expect(directQuickConnectEndpoints('Home-NAS', [{
      errno: 0,
      service: { port: 5001 },
      smartdns: {
        lan: ['192-168-0-2.home-nas.direct.quickconnect.to', 'attacker.example.com'],
        host: 'home-nas.direct.quickconnect.to',
      },
    }])).toEqual([
      'https://192-168-0-2.home-nas.direct.quickconnect.to:5001',
      'https://home-nas.direct.quickconnect.to:5001',
    ]);
  });

  it('rejects relay-only or malformed results', () => {
    expect(() => directQuickConnectEndpoints('Home-NAS', [{ errno: 0, service: { relay_port: 443 } }])).toThrow(/No direct/);
    expect(() => directQuickConnectEndpoints('Home-NAS', {})).toThrow(/unexpected response/);
  });

  it('queries Synology discovery without sending credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ errno: 0, service: { port: 5001 }, smartdns: { host: 'home-nas.direct.quickconnect.to' } }],
    });
    await expect(discoverQuickConnectEndpoints('Home-NAS', fetcher)).resolves.toEqual(['https://home-nas.direct.quickconnect.to:5001']);
    expect(fetcher).toHaveBeenCalledWith('https://global.quickconnect.to/Serv.php', expect.objectContaining({ method: 'POST' }));
    expect(fetcher.mock.calls[0]![1].body).not.toMatch(/password|username/i);
  });
});
