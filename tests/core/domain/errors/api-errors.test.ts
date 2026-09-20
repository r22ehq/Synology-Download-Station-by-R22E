import { describe, it, expect } from 'vitest';
import {
  SynoApiError,
  AuthenticationError,
  SessionExpiredError,
  TwoFactorRequiredError,
  PermissionDeniedError,
  NetworkError,
  TimeoutError,
  ConnectionError,
  translateSynoError,
  isRetryableError,
  getUserFriendlyMessage,
} from '@/core/domain/errors/api-errors';

describe('translateSynoError', () => {
  it('returns SessionExpiredError for code 105', () => {
    const err = translateSynoError(105);
    expect(err).toBeInstanceOf(SessionExpiredError);
    expect(err.code).toBe(105);
  });

  it('returns SessionExpiredError for code 119', () => {
    const err = translateSynoError(119);
    expect(err).toBeInstanceOf(SessionExpiredError);
  });

  it('returns AuthenticationError for code 400', () => {
    const err = translateSynoError(400);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('returns AuthenticationError for code 401 (disabled)', () => {
    const err = translateSynoError(401);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('returns TwoFactorRequiredError for code 403', () => {
    const err = translateSynoError(403);
    expect(err).toBeInstanceOf(TwoFactorRequiredError);
  });

  it('returns PermissionDeniedError for code 106', () => {
    const err = translateSynoError(106);
    expect(err).toBeInstanceOf(PermissionDeniedError);
  });

  it('returns SynoApiError for unknown codes', () => {
    const err = translateSynoError(999);
    expect(err).toBeInstanceOf(SynoApiError);
    expect(err.code).toBe(999);
  });

  it('preserves apiName in translated errors', () => {
    const err = translateSynoError(400, 'SYNO.API.Auth');
    expect(err.apiName).toBe('SYNO.API.Auth');
  });
});

describe('isRetryableError', () => {
  it('returns true for NetworkError', () => {
    expect(isRetryableError(new NetworkError('fail'))).toBe(true);
  });

  it('returns true for TimeoutError', () => {
    expect(isRetryableError(new TimeoutError())).toBe(true);
  });

  it('returns true for ConnectionError', () => {
    expect(isRetryableError(new ConnectionError())).toBe(true);
  });

  it('returns false for AuthenticationError', () => {
    expect(isRetryableError(new AuthenticationError('fail', 400))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isRetryableError('string')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

describe('getUserFriendlyMessage', () => {
  it('returns session message for SessionExpiredError', () => {
    const msg = getUserFriendlyMessage(new SessionExpiredError());
    expect(msg).toContain('session');
  });

  it('returns auth message for AuthenticationError', () => {
    const msg = getUserFriendlyMessage(new AuthenticationError('bad', 400));
    expect(msg).toContain('authenticate');
  });

  it('returns 2FA message for TwoFactorRequiredError', () => {
    const msg = getUserFriendlyMessage(new TwoFactorRequiredError());
    expect(msg).toContain('Two-factor');
  });

  it('returns generic message for unknown errors', () => {
    const msg = getUserFriendlyMessage(42);
    expect(msg).toContain('unexpected');
  });

  it('never exposes passwords or tokens', () => {
    const err = new SynoApiError('password=secret&sid=abc123', 100);
    const msg = getUserFriendlyMessage(err);
    expect(msg).not.toContain('secret');
    expect(msg).not.toContain('abc123');
  });
});
