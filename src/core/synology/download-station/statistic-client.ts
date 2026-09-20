import type { SynoHttpClient } from '../transport/http-client';
import type { ApiRegistry } from '../api-discovery/api-registry';
import { buildSynoParams } from '../transport/request-builder';
import type { RequestConfig } from '../types';
import type { DownloadStationStatistic } from './types';

export class StatisticClient {
  private readonly apiName = 'SYNO.DownloadStation.Statistic';
  private readonly maxClientVersion = 1;

  constructor(private httpClient: SynoHttpClient) {}

  public async getInfo(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<DownloadStationStatistic> {
    const version = registry.getNegotiatedVersion(this.apiName, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiName);

    const params = buildSynoParams(this.apiName, version, 'getinfo');

    return this.httpClient.get<DownloadStationStatistic>(baseUrl, endpoint, {
      ...config,
      sid,
      params: { ...config?.params, ...params },
    });
  }
}
