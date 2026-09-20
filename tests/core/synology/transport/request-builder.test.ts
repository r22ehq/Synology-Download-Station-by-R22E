import { describe, it, expect } from 'vitest';
import { buildSynoParams, encodeTaskIds, buildMultipartBody, buildUrlEncodedBody } from '@/core/synology/transport/request-builder';

describe('buildSynoParams', () => {
  it('builds standard Synology params', () => {
    const params = buildSynoParams('SYNO.API.Info', 1, 'query');
    expect(params.api).toBe('SYNO.API.Info');
    expect(params.version).toBe('1');
    expect(params.method).toBe('query');
  });

  it('includes extra params', () => {
    const params = buildSynoParams('SYNO.API.Auth', 6, 'login', {
      account: 'admin',
      session: 'DownloadStation',
    });
    expect(params.account).toBe('admin');
    expect(params.session).toBe('DownloadStation');
  });

  it('omits undefined extra params', () => {
    const params = buildSynoParams('SYNO.API.Auth', 6, 'login', {
      account: 'admin',
      otp_code: undefined,
    });
    expect(params.account).toBe('admin');
    expect('otp_code' in params).toBe(false);
  });

  it('converts boolean and number params to strings', () => {
    const params = buildSynoParams('SYNO.DownloadStation.Task', 1, 'delete', {
      force_complete: true,
    });
    expect(params.force_complete).toBe('true');
  });
});

describe('encodeTaskIds', () => {
  it('joins IDs with commas', () => {
    expect(encodeTaskIds(['dbid_1', 'dbid_2', 'dbid_3'])).toBe('dbid_1,dbid_2,dbid_3');
  });

  it('handles single ID', () => {
    expect(encodeTaskIds(['dbid_1'])).toBe('dbid_1');
  });

  it('handles empty array', () => {
    expect(encodeTaskIds([])).toBe('');
  });
});

describe('buildMultipartBody', () => {
  it('creates FormData with params', () => {
    const formData = buildMultipartBody({
      api: 'SYNO.DownloadStation.Task',
      version: 1,
      method: 'create',
    });
    expect(formData.get('api')).toBe('SYNO.DownloadStation.Task');
    expect(formData.get('version')).toBe('1');
    expect(formData.get('method')).toBe('create');
  });

  it('appends file when provided', () => {
    const file = new Blob(['fake torrent content'], { type: 'application/x-bittorrent' });
    const formData = buildMultipartBody({ api: 'test', version: 1, method: 'create' }, file);
    expect(formData.get('file')).toBeTruthy();
  });

  it('omits undefined params', () => {
    const formData = buildMultipartBody({
      api: 'test',
      destination: undefined,
    });
    expect(formData.has('destination')).toBe(false);
  });
});

describe('buildUrlEncodedBody', () => {
  it('creates URLSearchParams', () => {
    const body = buildUrlEncodedBody({ api: 'test', version: 1, method: 'pause' });
    expect(body.get('api')).toBe('test');
    expect(body.get('version')).toBe('1');
  });

  it('omits undefined values', () => {
    const body = buildUrlEncodedBody({ api: 'test', extra: undefined });
    expect(body.has('extra')).toBe(false);
  });
});
