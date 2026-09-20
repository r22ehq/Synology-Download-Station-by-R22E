import { describe, it, expect, beforeEach } from 'vitest';
import { ApiRegistry } from '@/core/synology/api-discovery/api-registry';

describe('ApiRegistry', () => {
  const registry = new ApiRegistry('https://nas.local:5001');

  beforeEach(() => {
    registry.clear();
    registry.register('SYNO.API.Auth', { minVersion: 1, maxVersion: 7, path: 'entry.cgi' });
    registry.register('SYNO.DownloadStation.Task', { minVersion: 1, maxVersion: 2, path: 'DownloadStation/task.cgi' });
  });

  it('checks availability of registered APIs', () => {
    expect(registry.isAvailable('SYNO.API.Auth')).toBe(true);
    expect(registry.isAvailable('SYNO.FileStation.List')).toBe(false);
  });

  it('returns API info for registered APIs', () => {
    const info = registry.get('SYNO.API.Auth');
    expect(info).toBeDefined();
    expect(info?.maxVersion).toBe(7);
    expect(info?.path).toBe('entry.cgi');
  });

  it('returns undefined for unregistered APIs', () => {
    expect(registry.get('SYNO.NonExistent')).toBeUndefined();
  });

  it('resolves endpoint path', () => {
    const path = registry.resolveEndpoint('SYNO.DownloadStation.Task');
    expect(path).toBe('DownloadStation/task.cgi');
  });

  it('throws when resolving unregistered API endpoint', () => {
    expect(() => registry.resolveEndpoint('SYNO.NonExistent')).toThrow();
  });

  it('negotiates version as min of client and server max', () => {
    // Server max=7, client wants 6 → use 6
    expect(registry.getNegotiatedVersion('SYNO.API.Auth', 6)).toBe(6);
    // Server max=7, client wants 10 → use 7
    expect(registry.getNegotiatedVersion('SYNO.API.Auth', 10)).toBe(7);
    // Server max=2, client wants 1 → use 1
    expect(registry.getNegotiatedVersion('SYNO.DownloadStation.Task', 1)).toBe(1);
  });

  it('throws when negotiating version for unregistered API', () => {
    expect(() => registry.getNegotiatedVersion('SYNO.NonExistent', 1)).toThrow();
  });

  it('clears all registered APIs', () => {
    registry.clear();
    expect(registry.isAvailable('SYNO.API.Auth')).toBe(false);
  });
});
