export class SynoApiError extends Error {
  public code: number;
  public apiName?: string;

  constructor(message: string, code: number, apiName?: string) {
    super(message);
    this.name = 'SynoApiError';
    this.code = code;
    this.apiName = apiName;
  }
}

export class AuthenticationError extends SynoApiError {
  constructor(message: string, code: number, apiName?: string) {
    super(message, code, apiName);
    this.name = 'AuthenticationError';
  }
}

export class SessionExpiredError extends SynoApiError {
  constructor(message: string = 'Session expired', code: number = 105, apiName?: string) {
    super(message, code, apiName);
    this.name = 'SessionExpiredError';
  }
}

export class TwoFactorRequiredError extends SynoApiError {
  constructor(
    message: string = 'Two-factor authentication required',
    code: number = 403,
    apiName?: string,
  ) {
    super(message, code, apiName);
    this.name = 'TwoFactorRequiredError';
  }
}

export class PermissionDeniedError extends SynoApiError {
  constructor(message: string = 'Permission denied', code: number = 106, apiName?: string) {
    super(message, code, apiName);
    this.name = 'PermissionDeniedError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends NetworkError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ConnectionError extends Error {
  constructor(message: string = 'NAS unreachable') {
    super(message);
    this.name = 'ConnectionError';
  }
}

export const translateSynoError = (code: number, apiName?: string): SynoApiError => {
  switch (code) {
    case 105:
    case 119:
      return new SessionExpiredError(`Session expired or invalid (Code: ${code})`, code, apiName);
    case 400:
      return new AuthenticationError(`Invalid credentials (Code: ${code})`, code, apiName);
    case 401:
      return new AuthenticationError(`Account disabled (Code: ${code})`, code, apiName);
    case 402:
      return new AuthenticationError(`Permission denied (Code: ${code})`, code, apiName);
    case 403:
      return new TwoFactorRequiredError(
        `Two-factor authentication required (Code: ${code})`,
        code,
        apiName,
      );
    case 106:
      return new PermissionDeniedError(`Insufficient privileges (Code: ${code})`, code, apiName);
    default:
      return new SynoApiError(`Unknown API Error (Code: ${code})`, code, apiName);
  }
};

export const isRetryableError = (error: unknown): boolean => {
  if (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof ConnectionError
  ) {
    return true;
  }
  return false;
};

export const getUserFriendlyMessage = (error: unknown): string => {
  if (error instanceof SessionExpiredError) {
    return 'Your session has expired. Please log in again.';
  }
  if (error instanceof TwoFactorRequiredError) {
    return 'Two-factor authentication is required to log in.';
  }
  if (error instanceof AuthenticationError) {
    return 'Failed to authenticate. Please check your username and password.';
  }
  if (error instanceof PermissionDeniedError) {
    return 'You do not have permission to perform this action.';
  }
  if (error instanceof TimeoutError) {
    return 'The request took too long. Please check your connection and try again.';
  }
  if (error instanceof ConnectionError) {
    return 'Could not connect to the NAS. Please check your network and NAS address.';
  }
  if (error instanceof NetworkError) {
    return 'A network error occurred. Please check your connection.';
  }
  if (error instanceof SynoApiError) {
    return `An error occurred while communicating with the NAS (Code: ${error.code}).`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
};
