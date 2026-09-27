/** Experimental direct-route discovery. QuickConnect relay is not supported here. */
export function normalizeQuickConnectId(value: string): string {
  const id = value.trim();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/i.test(id)) {
    throw new Error('Enter a valid QuickConnect ID (letters, numbers and hyphens only).');
  }
  return id;
}

interface ServerInfo {
  errno?: number;
  service?: { port?: number };
  smartdns?: { lan?: unknown; host?: unknown };
}

export function directQuickConnectEndpoints(id: string, response: unknown): string[] {
  const normalizedId = normalizeQuickConnectId(id).toLowerCase();
  if (!Array.isArray(response)) throw new Error('QuickConnect returned an unexpected response.');
  const endpoints: string[] = [];
  const suffix = `.${normalizedId}.direct.quickconnect.to`;
  for (const entry of response as ServerInfo[]) {
    if (entry?.errno !== 0) continue;
    const port = entry.service?.port;
    if (!Number.isInteger(port) || port! < 1 || port! > 65535) continue;
    // Never send NAS credentials to arbitrary hosts returned by the discovery service.
    for (const candidate of [...(Array.isArray(entry.smartdns?.lan) ? entry.smartdns.lan : []), entry.smartdns?.host]) {
      if (typeof candidate !== 'string') continue;
      const host = candidate.toLowerCase();
      if (host !== suffix.slice(1) && !host.endsWith(suffix)) continue;
      if (!/^[a-z0-9.-]+$/.test(host)) continue;
      const endpoint = `https://${host}:${port}`;
      if (!endpoints.includes(endpoint)) endpoints.push(endpoint);
    }
  }
  if (!endpoints.length) throw new Error('No direct QuickConnect address was found. Relay-only connections are not supported by this experimental option.');
  return endpoints;
}

export async function discoverQuickConnectEndpoints(id: string, fetcher: typeof fetch = fetch): Promise<string[]> {
  const normalizedId = normalizeQuickConnectId(id);
  const response = await fetcher('https://global.quickconnect.to/Serv.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      version: 1,
      command: 'get_server_info',
      stop_when_error: false,
      stop_when_success: false,
      id: 'dsm_portal_https',
      serverID: normalizedId,
      is_gofile: false,
    }]),
  });
  if (!response.ok) throw new Error(`QuickConnect discovery failed (${response.status}).`);
  return directQuickConnectEndpoints(normalizedId, await response.json());
}
