import { describe, it, expect } from 'vitest';
import { encodeUrls } from '../../../../src/core/synology/transport/request-builder';

describe('Synology URL Serializer', () => {
  it('correctly handles literal commas in URLs', () => {
    const urls = [
      'https://example.com/file,a.zip',
      'https://example.com/a,b,c',
      'magnet:?xt=...',
      'ed2k://...',
      'ftp://example.com/a,b',
    ];
    const encoded = encodeUrls(urls);
    expect(encoded).toBe(
      'https://example.com/file%2Ca.zip,https://example.com/a%2Cb%2Cc,magnet:?xt=...,ed2k://...,ftp://example.com/a%2Cb'
    );
  });
});
