import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '@/core/synology/transport/url-sanitizer';

describe('url-sanitizer', () => {
  it('redacts sensitive parameters', () => {
    const url = 'https://nas:5001/webapi/auth.cgi?api=SYNO.API.Auth&version=7&method=login&account=admin&passwd=TEST_PASSWORD_DO_NOT_LEAK&_sid=TEST_SID_DO_NOT_LEAK&otp_code=TEST_OTP_DO_NOT_LEAK&device_id=TEST_DEVICE_ID_DO_NOT_LEAK&device_token=TEST_DEVICE_TOKEN_DO_NOT_LEAK';
    const result = sanitizeUrl(url);
    
    expect(result).not.toContain('TEST_PASSWORD_DO_NOT_LEAK');
    expect(result).not.toContain('TEST_SID_DO_NOT_LEAK');
    expect(result).not.toContain('TEST_OTP_DO_NOT_LEAK');
    expect(result).not.toContain('TEST_DEVICE_ID_DO_NOT_LEAK');
    expect(result).not.toContain('TEST_DEVICE_TOKEN_DO_NOT_LEAK');

    const parsed = new URL(result);
    expect(parsed.searchParams.get('passwd')).toBe('[REDACTED]');
    expect(parsed.searchParams.get('_sid')).toBe('[REDACTED]');
    expect(parsed.searchParams.get('otp_code')).toBe('[REDACTED]');
    expect(parsed.searchParams.get('device_id')).toBe('[REDACTED]');
    expect(parsed.searchParams.get('device_token')).toBe('[REDACTED]');
  });

  it('handles invalid URLs safely', () => {
    const result = sanitizeUrl('not a url');
    expect(result).toBe('[Invalid/Sanitized URL]');
  });
});
