export function sanitizeUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const paramsToRedact = [
      'passwd', 'password', '_sid', 'sid', 'otp_code',
      'device_id', 'device_token', 'token'
    ];
    
    for (const key of Array.from(url.searchParams.keys())) {
      const lowerKey = key.toLowerCase();
      if (paramsToRedact.includes(lowerKey) || lowerKey.includes('auth')) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return url.toString();
  } catch {
    return '[Invalid/Sanitized URL]';
  }
}
