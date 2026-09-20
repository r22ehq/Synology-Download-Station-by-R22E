import { test, expect } from './fixtures/extension';
import { loadRealNasTestConfig } from './fixtures/real-nas-config';

test.describe('Real NAS Config Loader Validation', () => {
  const originalEnv = { ...process.env };

  test.beforeEach(() => {
    // Clear relevant environment variables before each test
    delete process.env.R22E_TEST_NAS_URL;
    delete process.env.R22E_TEST_USERNAME;
    delete process.env.R22E_TEST_PASSWORD;
    delete process.env.R22E_TEST_DESTINATION;
  });

  test.afterAll(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  test('returns null when R22E_TEST_NAS_URL is absent', () => {
    expect(loadRealNasTestConfig()).toBeNull();
  });

  test('fails if username is missing', () => {
    process.env.R22E_TEST_NAS_URL = 'http://192.168.1.100:5000';
    process.env.R22E_TEST_PASSWORD = 'super_secret_password';
    process.env.R22E_TEST_DESTINATION = '/volume1/downloads';
    
    expect(() => loadRealNasTestConfig()).toThrow('Real NAS testing enabled but R22E_TEST_USERNAME is missing.');
  });

  test('fails if password is missing', () => {
    process.env.R22E_TEST_NAS_URL = 'http://192.168.1.100:5000';
    process.env.R22E_TEST_USERNAME = 'admin';
    process.env.R22E_TEST_DESTINATION = '/volume1/downloads';
    
    expect(() => loadRealNasTestConfig()).toThrow('Real NAS testing enabled but R22E_TEST_PASSWORD is missing.');
  });

  test('fails if destination is missing', () => {
    process.env.R22E_TEST_NAS_URL = 'http://192.168.1.100:5000';
    process.env.R22E_TEST_USERNAME = 'admin';
    process.env.R22E_TEST_PASSWORD = 'super_secret_password';
    
    expect(() => loadRealNasTestConfig()).toThrow('Real NAS testing enabled but R22E_TEST_DESTINATION is missing.');
  });

  test('fails if NAS URL is malformed and does not log password', () => {
    process.env.R22E_TEST_NAS_URL = 'not a valid url';
    process.env.R22E_TEST_USERNAME = 'admin';
    process.env.R22E_TEST_PASSWORD = 'super_secret_password_123';
    process.env.R22E_TEST_DESTINATION = '/volume1/downloads';
    
    let caughtError: Error | undefined;
    try {
      loadRealNasTestConfig();
    } catch (e: unknown) {
      caughtError = e instanceof Error ? e : new Error(String(e));
    }
    
    expect(caughtError).toBeDefined();
    expect(caughtError!.message).toContain('Real NAS testing enabled but R22E_TEST_NAS_URL is malformed.');
    expect(caughtError!.message).not.toContain('super_secret_password_123');
  });

  test('succeeds with valid configuration', () => {
    process.env.R22E_TEST_NAS_URL = 'http://192.168.1.100:5000/';
    process.env.R22E_TEST_USERNAME = 'test_user';
    process.env.R22E_TEST_PASSWORD = 'test_password';
    process.env.R22E_TEST_DESTINATION = '/volume1/test_dest';
    
    const config = loadRealNasTestConfig();
    expect(config).not.toBeNull();
    expect(config!.nasUrl).toBe('http://192.168.1.100:5000'); // Trailing slash normalized
    expect(config!.username).toBe('test_user');
    expect(config!.password).toBe('test_password');
    expect(config!.destination).toBe('/volume1/test_dest');
  });
});
