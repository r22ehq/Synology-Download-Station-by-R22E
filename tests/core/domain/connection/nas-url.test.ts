import { describe, it, expect } from 'vitest';
import { normalizeNasUrl } from '@/core/domain/connection/nas-url';

describe('normalizeNasUrl', () => {
  it('adds https protocol when none specified', () => {
    const result = normalizeNasUrl('192.168.1.10');
    expect(result.protocol).toBe('https');
    expect(result.host).toBe('192.168.1.10');
    expect(result.port).toBe(5001);
    expect(result.baseUrl).toBe('https://192.168.1.10:5001');
  });

  it('uses default port 5000 for http', () => {
    const result = normalizeNasUrl('http://nas.local');
    expect(result.protocol).toBe('http');
    expect(result.host).toBe('nas.local');
    expect(result.port).toBe(5000);
    expect(result.baseUrl).toBe('http://nas.local:5000');
  });

  it('uses default port 5001 for https', () => {
    const result = normalizeNasUrl('https://nas.local');
    expect(result.protocol).toBe('https');
    expect(result.port).toBe(5001);
  });

  it('preserves explicit port', () => {
    const result = normalizeNasUrl('https://nas.example.com:8443');
    expect(result.port).toBe(8443);
    expect(result.baseUrl).toBe('https://nas.example.com:8443');
  });

  it('handles IP with explicit port', () => {
    const result = normalizeNasUrl('http://10.0.0.5:5000');
    expect(result.protocol).toBe('http');
    expect(result.host).toBe('10.0.0.5');
    expect(result.port).toBe(5000);
  });

  it('trims whitespace', () => {
    const result = normalizeNasUrl('  https://nas.local:5001  ');
    expect(result.host).toBe('nas.local');
  });

  it('throws on invalid URL', () => {
    expect(() => normalizeNasUrl('not a url')).toThrow('Invalid NAS URL: not a url');
  });

  it('throws on completely empty input', () => {
    expect(() => normalizeNasUrl('')).toThrow();
  });

  it('handles hostname with subdomain', () => {
    const result = normalizeNasUrl('https://dsm.home.example.com:5001');
    expect(result.host).toBe('dsm.home.example.com');
    expect(result.port).toBe(5001);
  });
});
