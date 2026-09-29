import { describe, expect, it } from 'vitest';
import { hostPermissionPattern } from '../../../../src/core/platform/browser/host-permission-pattern';

describe('hostPermissionPattern', () => {
  it('omits non-default NAS ports only in Firefox permissions', () => {
    expect(hostPermissionPattern('https://192.168.0.81:5001/path', 'firefox')).toBe('https://192.168.0.81/*');
    expect(hostPermissionPattern('http://nas.local:5000/path', 'firefox')).toBe('http://nas.local/*');
  });
  it.each(['chrome', 'edge', 'opera'] as const)('preserves %s origin behavior', browserName => {
    expect(hostPermissionPattern('https://nas.local:5001/path', browserName)).toBe('https://nas.local:5001/*');
  });
  it('keeps IPv6 brackets and drops credentials/path', () => {
    expect(hostPermissionPattern('https://user:secret@[::1]:5001/path', 'firefox')).toBe('https://[::1]/*');
  });
  it('does not broaden the selected hostname', () => {
    expect(hostPermissionPattern('https://tracker.example.com/file.torrent', 'firefox')).toBe('https://tracker.example.com/*');
  });
  it('rejects non-web addresses', () => {
    expect(() => hostPermissionPattern('file:///tmp/test', 'firefox')).toThrow();
  });
});
