import type { SynoHttpClient } from '../transport/http-client';
import type { ApiRegistry } from '../api-discovery/api-registry';
import { buildSynoParams } from '../transport/request-builder';
import type { RequestConfig } from '../types';
import type { FileListResponse, ShareListResponse } from './types';

export class FileStationClient {
  private readonly listApi = 'SYNO.FileStation.List';

  constructor(private httpClient: SynoHttpClient) {}

  public async listShares(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<ShareListResponse> {
    const caps = registry.getCapabilities();
    if (!caps.fsList.supported) throw new Error('FileStation List API is not available');
    const version = caps.fsList.selectedVersion;
    const endpoint = registry.resolveEndpoint(this.listApi);

    const params = buildSynoParams(this.listApi, version, 'list_share');

    return this.httpClient.get<ShareListResponse>(baseUrl, endpoint, {
      ...config,
      sid,
      params: { ...config?.params, ...params },
    });
  }

  public async listFolder(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    folderPath: string,
    options?: {
      offset?: number;
      limit?: number;
      filetype?: 'all' | 'dir' | 'file';
    },
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<FileListResponse> {
    const caps = registry.getCapabilities();
    if (!caps.fsList.supported) throw new Error('FileStation List API is not available');
    const version = caps.fsList.selectedVersion;
    const endpoint = registry.resolveEndpoint(this.listApi);

    const extraParams: Record<string, string | number> = {
      folder_path: folderPath,
    };

    if (options?.offset !== undefined) extraParams.offset = options.offset;
    if (options?.limit !== undefined) extraParams.limit = options.limit;
    if (options?.filetype !== undefined) extraParams.filetype = options.filetype;

    const params = buildSynoParams(this.listApi, version, 'list', extraParams);

    return this.httpClient.get<FileListResponse>(baseUrl, endpoint, {
      ...config,
      sid,
      params: { ...config?.params, ...params },
    });
  }
}
