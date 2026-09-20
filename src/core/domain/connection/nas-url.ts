export interface NormalizedUrlResult {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  baseUrl: string;
}

export function normalizeNasUrl(input: string): NormalizedUrlResult {
  let urlStr = input.trim();

  // If no protocol specified, assume https
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `https://${urlStr}`;
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch (e: unknown) {
    throw new Error(`Invalid NAS URL: ${input}`, { cause: e });
  }

  const protocol = url.protocol === 'http:' ? 'http' : 'https';
  let port = url.port ? parseInt(url.port, 10) : undefined;
  const host = url.hostname;

  if (!port) {
    port = protocol === 'https' ? 5001 : 5000;
  }

  // Construct standard base URL
  const baseUrl = `${protocol}://${host}:${port}`;

  return {
    protocol,
    host,
    port,
    baseUrl,
  };
}
