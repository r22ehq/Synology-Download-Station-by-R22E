import type { SynoHttpClient } from '../transport/http-client';
import type { ApiRegistry } from '../api-discovery/api-registry';
import { buildSynoParams, buildUrlEncodedBody } from '../transport/request-builder';
import type { RequestConfig } from '../types';
import type { DownloadStationInfo, DownloadStationConfig } from './types';

export class InfoClient {
  private readonly apiNameInfo = 'SYNO.DownloadStation.Info';
  private readonly maxClientVersion = 2;

  constructor(private httpClient: SynoHttpClient) {}

  public async getInfo(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<DownloadStationInfo> {
    const version = registry.getNegotiatedVersion(this.apiNameInfo, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiNameInfo);

    const params = buildSynoParams(this.apiNameInfo, version, 'getinfo');

    return this.httpClient.get<DownloadStationInfo>(baseUrl, endpoint, {
      ...config,
      sid,
      params: { ...config?.params, ...params },
    });
  }

  public async getConfig(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<DownloadStationConfig> {
    const version = registry.getNegotiatedVersion(this.apiNameInfo, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiNameInfo);

    const params = buildSynoParams(this.apiNameInfo, version, 'getconfig');

    return this.httpClient.get<DownloadStationConfig>(baseUrl, endpoint, {
      ...config,
      sid,
      params: { ...config?.params, ...params },
    });
  }

  public async setConfig(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    updateConfig: Partial<DownloadStationConfig>,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<void> {
    const version = registry.getNegotiatedVersion(this.apiNameInfo, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiNameInfo);

    const params = buildSynoParams(
      this.apiNameInfo,
      version,
      'setserverconfig',
      updateConfig as Record<string, string | number | boolean>,
    );
    const body = buildUrlEncodedBody(params);

    await this.httpClient.post<void>(baseUrl, endpoint, body, {
      ...config,
      sid,
    });
  }
}
