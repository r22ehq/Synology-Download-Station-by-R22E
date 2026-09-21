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

    expect(result).toContain('passwd=[REDACTED]');
    expect(result).toContain('_sid=[REDACTED]');
    expect(result).toContain('otp_code=[REDACTED]');
    expect(result).toContain('device_token=[REDACTED]');
  });

  it('handles invalid URLs safely', () => {
    const result = sanitizeUrl('not a url');
    expect(result).toBe('[Invalid/Sanitized URL]');
  });
});
