import type { NasProfile } from '@/core/platform/storage/storage-items';

/** Open the DSM desktop and request its Download Station application. */
export function downloadStationUrl(profile: Pick<NasProfile, 'protocol' | 'host' | 'port'>): string {
  const url = new URL(`${profile.protocol}://${profile.host}:${profile.port}/`);
  url.searchParams.set('launchApp', 'SYNO.SDS.DownloadStation.Application');
  return url.toString();
}

/** DSM File Station's folder-opening launch parameter uses the shared-folder path, not /volumeN. */
export function fileStationFolderUrl(profile: Pick<NasProfile, 'protocol' | 'host' | 'port'>, destination: string): string {
  const raw = destination.trim();
  const folder = `/${raw.replace(/^\/+/, '').replace(/^(?:volume\d+|volumeUSB\d+)\//i, '')}`;
  if (!raw || folder === '/' || folder.split('/').includes('..')) {
    throw new Error('This task does not have a valid destination folder.');
  }
  const url = new URL(`${profile.protocol}://${profile.host}:${profile.port}/index.cgi`);
  url.searchParams.set('launchApp', 'SYNO.SDS.App.FileStation3.Instance');
  url.searchParams.set('launchParam', `openfile=${encodeURIComponent(folder)}`);
  return url.toString();
}
