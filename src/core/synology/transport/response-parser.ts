import type { SynoResponse } from '../types';
import { SynoError } from '../types';

export async function parseSynoResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (_error: unknown) {
    throw new Error('Failed to parse JSON response from Synology API', { cause: _error });
  }

  // Type guard for SynoResponse envelope
  if (typeof data !== 'object' || data === null || !('success' in data)) {
    throw new Error('Invalid response envelope from Synology API');
  }

  const synoResponse = data as SynoResponse<T>;

  if (!synoResponse.success) {
    const errCode = synoResponse.error?.code ?? -1;
    const errDetails = synoResponse.error?.errors;
    throw new SynoError(errCode, `Synology API Error: ${errCode}`, errDetails);
  }

  return synoResponse.data;
}
