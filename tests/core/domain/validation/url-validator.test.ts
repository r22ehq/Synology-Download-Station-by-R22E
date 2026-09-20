import { describe, it, expect } from 'vitest';
import { UrlValidator } from '@/core/domain/validation/url-validator';

describe('UrlValidator', () => {
  describe('isValidHttpUrl', () => {
    it('accepts http URLs', () => {
      expect(UrlValidator.isValidHttpUrl('http://example.com/file.zip')).toBe(true);
    });

    it('accepts https URLs', () => {
      expect(UrlValidator.isValidHttpUrl('https://example.com/file.iso')).toBe(true);
    });

    it('rejects magnet links', () => {
      expect(UrlValidator.isValidHttpUrl('magnet:?xt=urn:btih:abc')).toBe(false);
    });

    it('rejects bare strings', () => {
      expect(UrlValidator.isValidHttpUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(UrlValidator.isValidHttpUrl('')).toBe(false);
    });

    it('rejects ftp URLs', () => {
      expect(UrlValidator.isValidHttpUrl('ftp://example.com/file.zip')).toBe(false);
    });
  });

  describe('isMagnetLink', () => {
    it('detects magnet links', () => {
      expect(UrlValidator.isMagnetLink('magnet:?xt=urn:btih:abc123')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(UrlValidator.isMagnetLink('MAGNET:?xt=urn:btih:abc123')).toBe(true);
    });

    it('trims whitespace', () => {
      expect(UrlValidator.isMagnetLink('  magnet:?xt=urn:btih:abc  ')).toBe(true);
    });

    it('rejects http URLs', () => {
      expect(UrlValidator.isMagnetLink('http://example.com')).toBe(false);
    });
  });

  describe('isEd2kLink', () => {
    it('detects ed2k links', () => {
      expect(UrlValidator.isEd2kLink('ed2k://|file|name|size|hash|/')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(UrlValidator.isEd2kLink('ED2K://|file|name|size|hash|/')).toBe(true);
    });

    it('rejects other links', () => {
      expect(UrlValidator.isEd2kLink('http://example.com')).toBe(false);
    });
  });

  describe('isTorrentFile', () => {
    it('detects .torrent files', () => {
      expect(UrlValidator.isTorrentFile('ubuntu.torrent')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(UrlValidator.isTorrentFile('file.TORRENT')).toBe(true);
    });

    it('rejects non-torrent files', () => {
      expect(UrlValidator.isTorrentFile('file.zip')).toBe(false);
    });
  });

  describe('classifyLink', () => {
    it('classifies HTTP URLs', () => {
      expect(UrlValidator.classifyLink('https://example.com/file.zip')).toBe('http');
    });

    it('classifies magnet links', () => {
      expect(UrlValidator.classifyLink('magnet:?xt=urn:btih:abc')).toBe('magnet');
    });

    it('classifies ed2k links', () => {
      expect(UrlValidator.classifyLink('ed2k://|file|name|')).toBe('ed2k');
    });

    it('classifies torrent filenames', () => {
      expect(UrlValidator.classifyLink('ubuntu.torrent')).toBe('torrent');
    });

    it('returns unknown for unrecognized input', () => {
      expect(UrlValidator.classifyLink('random text')).toBe('unknown');
    });
  });

  describe('parseDownloadLinks', () => {
    it('parses multiline input', () => {
      const input = `https://example.com/file1.zip
magnet:?xt=urn:btih:abc123
https://example.com/file2.iso`;
      const result = UrlValidator.parseDownloadLinks(input);
      expect(result).toHaveLength(3);
    });

    it('filters out invalid lines', () => {
      const input = `https://example.com/file1.zip
some random text
magnet:?xt=urn:btih:abc123`;
      const result = UrlValidator.parseDownloadLinks(input);
      expect(result).toHaveLength(2);
    });

    it('handles empty input', () => {
      expect(UrlValidator.parseDownloadLinks('')).toEqual([]);
    });

    it('trims whitespace from lines', () => {
      const input = '  https://example.com/file.zip  ';
      const result = UrlValidator.parseDownloadLinks(input);
      expect(result).toHaveLength(1);
    });

    it('handles Windows-style line endings', () => {
      const input = 'https://a.com/1\r\nhttps://b.com/2';
      const result = UrlValidator.parseDownloadLinks(input);
      expect(result).toHaveLength(2);
    });
  });
});
