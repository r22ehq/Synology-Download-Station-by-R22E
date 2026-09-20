import { SynoHttpClient } from '../transport/http-client';
import { buildSynoParams } from '../transport/request-builder';
import { ApiRegistry } from '../api-discovery/api-registry';
import type { LoginResult, LoginOptions } from './types';

export class AuthClient {
  private httpClient: SynoHttpClient;
  private defaultSessionName = 'DownloadStation';

  constructor(httpClient: SynoHttpClient) {
    this.httpClient = httpClient;
  }

  public async login(
    baseUrl: string,
    registry: ApiRegistry,
    account: string,
    password: string,
    options?: LoginOptions,
  ): Promise<LoginResult> {
    const apiName = 'SYNO.API.Auth';
    if (!registry.isAvailable(apiName)) {
      throw new Error('Auth API not available');
    }

    const version = registry.getNegotiatedVersion(apiName, 6);
    const endpoint = registry.resolveEndpoint(apiName);

    const extraParams: Record<string, string> = {
      account,
      passwd: password,
      session: options?.session ?? this.defaultSessionName,
      format: options?.format ?? 'sid',
    };

    if (options?.otpCode) extraParams.otp_code = options.otpCode;
    if (options?.enableDeviceToken) extraParams.enable_device_token = options.enableDeviceToken;
    if (options?.deviceId) extraParams.device_id = options.deviceId;
    if (options?.deviceName) extraParams.device_name = options.deviceName;

    const params = buildSynoParams(apiName, version, 'login', extraParams);

    return this.httpClient.get<LoginResult>(baseUrl, endpoint, { params });
  }

  public async loginWith2FA(
    baseUrl: string,
    registry: ApiRegistry,
    account: string,
    password: string,
    otpCode: string,
    options?: Omit<LoginOptions, 'otpCode'>,
  ): Promise<LoginResult> {
    return this.login(baseUrl, registry, account, password, { ...options, otpCode });
  }

  public async logout(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    sessionName?: string,
  ): Promise<void> {
    const apiName = 'SYNO.API.Auth';
    if (!registry.isAvailable(apiName)) {
      return;
    }

    const version = registry.getNegotiatedVersion(apiName, 6);
    const endpoint = registry.resolveEndpoint(apiName);

    const params = buildSynoParams(apiName, version, 'logout', {
      session: sessionName ?? this.defaultSessionName,
    });

    try {
      await this.httpClient.get<void>(baseUrl, endpoint, { params, sid });
    } catch (_e: unknown) {
      // Ignore errors on logout
    }
  }
}
