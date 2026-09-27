import { normalizeNasUrl } from '../../../src/core/domain/connection/nas-url';

export interface RealNasTestConfig {
  nasUrl: string;
  baseUrl: string;
  username: string;
  password: string;
  destination: string;
}

export function loadRealNasTestConfig(): RealNasTestConfig | null {
  if (!process.env.R22E_TEST_NAS_URL) {
    return null; // Skip signal
  }

  const rawUrl = process.env.R22E_TEST_NAS_URL;
  const username = process.env.R22E_TEST_USERNAME;
  const password = process.env.R22E_TEST_PASSWORD;
  const destination = process.env.R22E_TEST_DESTINATION;

  if (!username) {
    throw new Error('Real NAS testing enabled but R22E_TEST_USERNAME is missing.');
  }

  if (!password) {
    throw new Error('Real NAS testing enabled but R22E_TEST_PASSWORD is missing.');
  }

  if (!destination) {
    throw new Error('Real NAS testing enabled but R22E_TEST_DESTINATION is missing.');
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeNasUrl(rawUrl).baseUrl;
  } catch (e) {
    throw new Error('Real NAS testing enabled but R22E_TEST_NAS_URL is malformed.', { cause: e });
  }

  return Object.freeze({
    nasUrl: normalizedUrl,
    baseUrl: normalizedUrl, // For backwards compatibility, though often same as nasUrl
    username,
    password,
    destination
  });
}
