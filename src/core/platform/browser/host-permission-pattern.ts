import { getBrowserInfo, type BrowserInfo } from './browser-adapter';

/** Firefox permission patterns cannot include a port; the NAS URL still can. */
export const hostPermissionPattern = (
  url: string,
  browserName: BrowserInfo['name'] = getBrowserInfo().name,
): string => {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Host access requires an HTTP or HTTPS address.');
  }
  const origin = browserName === 'firefox'
    ? `${parsed.protocol}//${parsed.hostname}`
    : parsed.origin;
  return `${origin}/*`;
};
