import { describe, expect, it } from 'vitest';
import { downloadStationUrl, fileStationFolderUrl } from '../../src/ui/utils/download-station-url';

describe('Download Station launch URL', () => {
  it('uses the DSM app launcher instead of the optional /download/ alias', () => {
    expect(downloadStationUrl({ protocol: 'http', host: '192.0.2.81', port: 5000 }))
      .toBe('http://192.0.2.81:5000/?launchApp=SYNO.SDS.DownloadStation.Application');
  });
});

describe('File Station folder launch URL', () => {
  const profile = { protocol: 'https' as const, host: 'nas.example.com', port: 5001 };

  it('opens the destination share and safely encodes folder names', () => {
    const url = new URL(fileStationFolderUrl(profile, '/volume1/My Downloads/Movies'));
    expect(url.pathname).toBe('/index.cgi');
    expect(url.searchParams.get('launchApp')).toBe('SYNO.SDS.App.FileStation3.Instance');
    expect(url.searchParams.get('launchParam')).toBe('openfile=%2FMy%20Downloads%2FMovies');
  });

  it('accepts a shared-folder name and rejects missing destinations', () => {
    expect(new URL(fileStationFolderUrl(profile, 'downloads')).searchParams.get('launchParam')).toBe('openfile=%2Fdownloads');
    expect(() => fileStationFolderUrl(profile, '')).toThrow('valid destination folder');
  });
});
