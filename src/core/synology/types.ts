export interface SynoResponseSuccess<T> {
  success: true;
  data: T;
}

export interface SynoResponseError {
  success: false;
  error: {
    code: number;
    errors?: Array<{ code: number; message: string }>;
  };
}

export type SynoResponse<T> = SynoResponseSuccess<T> | SynoResponseError;

export class SynoError extends Error {
  public code: number;
  public errors?: Array<{ code: number; message: string }>;

  constructor(code: number, message: string, errors?: Array<{ code: number; message: string }>) {
    super(message);
    this.name = 'SynoError';
    this.code = code;
    this.errors = errors;

    // Set prototype explicitly for built-in classes in TS
    Object.setPrototypeOf(this, SynoError.prototype);
  }
}

export interface SynoApiInfo {
  maxVersion: number;
  minVersion: number;
  path: string;
}

export interface RequestConfig {
  timeout?: number;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  sid?: string;
  synoToken?: string;
}

export const SynoCommonErrorCodes = {
  UNKNOWN: 100,
  INVALID_PARAM: 101,
  API_NOT_EXIST: 102,
  METHOD_NOT_EXIST: 103,
  VERSION_NOT_SUPPORT: 104,
  PERMISSION_DENIED: 105,
  SESSION_TIMEOUT: 106,
  SESSION_INTERRUPTED: 107,
  UPLOAD_FILE_TOO_LARGE: 108,
  INVALID_SESSION: 119,
  REQUEST_SOURCE_IP_MISMATCH: 150,
} as const;
