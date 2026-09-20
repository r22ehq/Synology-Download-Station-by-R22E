export interface LoginResult {
  sid: string;
  synotoken?: string;
  did?: string;
  device_id?: string;
}

export interface LoginOptions {
  session?: string;
  format?: 'cookie' | 'sid';
  otpCode?: string;
  enableDeviceToken?: 'yes' | 'no';
  deviceId?: string;
  deviceName?: string;
}

export interface AuthSession {
  sid: string;
  synoToken?: string;
}

export const AuthErrorCodes = {
  INVALID_CREDENTIALS: 400,
  NO_SUCH_ACCOUNT: 400,
  ACCOUNT_DISABLED: 401,
  PERMISSION_DENIED: 402,
  TWO_STEP_AUTH_REQUIRED: 403,
  TWO_STEP_AUTH_FAILED: 404,
  APP_PORTAL_NOT_SUPPORTED: 405,
  OTP_CODE_ENFORCED: 406, // two-factor verification required/forced flow
  IP_BLOCKED: 407, // source IP/account temporarily blocked
  PASSWORD_EXPIRED: 408,
  PASSWORD_EXPIRED_2: 409,
  PASSWORD_CHANGE_REQUIRED: 410,
} as const;
