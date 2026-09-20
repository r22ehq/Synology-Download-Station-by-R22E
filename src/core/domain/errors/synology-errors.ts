import { SynoError } from '../../synology/types';
import { AuthErrorCodes } from '../../synology/auth/types';
import { SynoCommonErrorCodes } from '../../synology/types';

export class InvalidCredentialsError extends Error { override name = 'InvalidCredentialsError'; }
export class AccountDisabledError extends Error { override name = 'AccountDisabledError'; }
export class PermissionDeniedError extends Error { override name = 'PermissionDeniedError'; }
export class TwoFactorRequiredError extends Error { override name = 'TwoFactorRequiredError'; }
export class InvalidOtpError extends Error { override name = 'InvalidOtpError'; }
export class TwoFactorForcedError extends Error { override name = 'TwoFactorForcedError'; }
export class IpBlockedError extends Error { override name = 'IpBlockedError'; }
export class PasswordExpiredError extends Error { override name = 'PasswordExpiredError'; }
export class PasswordChangeRequiredError extends Error { override name = 'PasswordChangeRequiredError'; }
export class SessionExpiredError extends Error { override name = 'SessionExpiredError'; }
export class SessionReplacedError extends Error { override name = 'SessionReplacedError'; }
export class InvalidSessionError extends Error { override name = 'InvalidSessionError'; }
export class SessionPermissionDeniedError extends Error { override name = 'SessionPermissionDeniedError'; }
export class SourceIpMismatchError extends Error { override name = 'SourceIpMismatchError'; }
export class NetworkUnavailableError extends Error { override name = 'NetworkUnavailableError'; }
export class UnknownSynologyError extends Error {
  override name = 'UnknownSynologyError';
  constructor(message: string, public readonly code: number) {
    super(message);
  }
}

export function mapSynologyError(err: unknown): Error {
  if (err instanceof SynoError) {
    switch (err.code) {
      case AuthErrorCodes.INVALID_CREDENTIALS:
        return new InvalidCredentialsError('Invalid credentials');
      case AuthErrorCodes.ACCOUNT_DISABLED:
        return new AccountDisabledError('Account is disabled');
      case AuthErrorCodes.PERMISSION_DENIED:
        return new PermissionDeniedError('Permission denied');
      case AuthErrorCodes.TWO_STEP_AUTH_REQUIRED:
        return new TwoFactorRequiredError('Two factor verification required');
      case AuthErrorCodes.TWO_STEP_AUTH_FAILED:
        return new InvalidOtpError('Invalid verification code');
      case AuthErrorCodes.OTP_CODE_ENFORCED:
        return new TwoFactorForcedError('Two factor verification forced');
      case AuthErrorCodes.IP_BLOCKED:
        return new IpBlockedError('IP or account temporarily blocked');
      case AuthErrorCodes.PASSWORD_EXPIRED:
      case AuthErrorCodes.PASSWORD_EXPIRED_2:
        return new PasswordExpiredError('Password expired');
      case AuthErrorCodes.PASSWORD_CHANGE_REQUIRED:
        return new PasswordChangeRequiredError('Password change required');
      case SynoCommonErrorCodes.SESSION_TIMEOUT:
        return new SessionExpiredError('Session timeout');
      case SynoCommonErrorCodes.SESSION_INTERRUPTED:
        return new SessionReplacedError('Session interrupted or replaced');
      case SynoCommonErrorCodes.INVALID_SESSION:
        return new InvalidSessionError('Invalid session');
      case SynoCommonErrorCodes.PERMISSION_DENIED:
        return new SessionPermissionDeniedError('Session lacks required permission');
      case SynoCommonErrorCodes.REQUEST_SOURCE_IP_MISMATCH:
        return new SourceIpMismatchError('Source IP mismatch');
    }
    return new UnknownSynologyError(`Unknown Synology Error: ${err.code}`, err.code);
  }
  
  if (err instanceof Error && err.name === 'AbortError') {
    return new NetworkUnavailableError('Request timeout or aborted', { cause: err });
  }
  
  if (err instanceof Error && err.message.includes('fetch')) {
    return new NetworkUnavailableError('Failed to fetch', { cause: err });
  }
  
  return err instanceof Error ? err : new Error(String(err));
}
