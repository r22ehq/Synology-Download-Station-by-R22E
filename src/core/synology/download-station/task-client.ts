import type { SynoHttpClient } from '../transport/http-client';
import type { ApiRegistry } from '../api-discovery/api-registry';
import {
  buildSynoParams,
  encodeTaskIds,
  buildMultipartBody,
  buildUrlEncodedBody,
  encodeUrls,
} from '../transport/request-builder';
import type { RequestConfig } from '../types';
import type { TaskListResponse, TaskActionResult, TaskCreateOptions, DownloadTask } from './types';

export class TaskClient {
  private readonly apiName = 'SYNO.DownloadStation.Task';
  private readonly maxClientVersion = 2;

  constructor(private httpClient: SynoHttpClient) {}

  public async list(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    options?: {
      offset?: number;
      limit?: number;
      additional?: Array<'detail' | 'transfer' | 'file' | 'tracker' | 'peer'>;
    },
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<TaskListResponse> {
    const version = registry.getNegotiatedVersion(this.apiName, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiName);

    const extraParams: Record<string, string | number> = {};
    if (options?.offset !== undefined) extraParams.offset = options.offset;
    if (options?.limit !== undefined) extraParams.limit = options.limit;
    if (options?.additional?.length) {
      extraParams.additional = options.additional.join(',');
    }

    const params = buildSynoParams(this.apiName, version, 'list', extraParams);

    return this.httpClient.get<TaskListResponse>(baseUrl, endpoint, {
      ...config,
      sid,
      params: { ...config?.params, ...params },
    });
  }

  public async getInfo(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    ids: string[],
    additional?: Array<'detail' | 'transfer' | 'file' | 'tracker' | 'peer'>,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<{ tasks: DownloadTask[] }> {
    const version = registry.getNegotiatedVersion(this.apiName, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiName);

    const extraParams: Record<string, string> = {
      id: encodeTaskIds(ids),
    };
    if (additional?.length) {
      extraParams.additional = additional.join(',');
    }

    const params = buildSynoParams(this.apiName, version, 'getinfo', extraParams);

    return this.httpClient.get<{ tasks: DownloadTask[] }>(baseUrl, endpoint, {
      ...config,
      sid,
      params: { ...config?.params, ...params },
    });
  }

  public async create(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    options: TaskCreateOptions,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<void> {
    const version = registry.getNegotiatedVersion(this.apiName, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiName);

    const extraParams: Record<string, string | undefined | number> = {
      destination: options.destination,
      username: options.username,
      password: options.password,
      unzip_password: options.unzip_password,
      _sid: sid,
    };

    if (options.uri?.length) {
      extraParams.uri = encodeUrls(options.uri);
    }

    const params = buildSynoParams(this.apiName, version, 'create', extraParams);

    if (options.file) {
      // DSM 7 quirk: Unnamed Blobs or missing .torrent extension on Files can result in 
      // the DS rejecting the multipart body.
      let fileToUpload = options.file;
      if (options.file instanceof File) {
        let safeName = options.file.name.replace(/[^a-zA-Z0-9_\-.]/g, '_');
        if (!safeName || safeName.trim() === '_') {
          safeName = 'upload';
        }
        if (!safeName.toLowerCase().endsWith('.torrent')) {
          safeName = `${safeName}.torrent`;
        }
        
        // Only mutate if name changed
        if (safeName !== options.file.name) {
          fileToUpload = new File([options.file], safeName, { type: options.file.type });
        }
      }

      const body = buildMultipartBody(params, fileToUpload);
      await this.httpClient.post<void>(baseUrl, endpoint, body, {
        ...config,
        sid,
      });
    } else {
      const body = buildUrlEncodedBody(params);
      await this.httpClient.post<void>(baseUrl, endpoint, body, {
        ...config,
        sid,
      });
    }
  }

  public async pause(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    ids: string[],
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<TaskActionResult[]> {
    const version = registry.getNegotiatedVersion(this.apiName, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiName);

    const params = buildSynoParams(this.apiName, version, 'pause', {
      id: encodeTaskIds(ids),
      _sid: sid,
    });

    const body = buildUrlEncodedBody(params);
    return this.httpClient.post<TaskActionResult[]>(baseUrl, endpoint, body, {
      ...config,
      sid,
    });
  }

  public async resume(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    ids: string[],
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<TaskActionResult[]> {
    const version = registry.getNegotiatedVersion(this.apiName, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiName);

    const params = buildSynoParams(this.apiName, version, 'resume', {
      id: encodeTaskIds(ids),
      _sid: sid,
    });

    const body = buildUrlEncodedBody(params);
    return this.httpClient.post<TaskActionResult[]>(baseUrl, endpoint, body, {
      ...config,
      sid,
    });
  }

  public async delete(
    baseUrl: string,
    registry: ApiRegistry,
    sid: string,
    ids: string[],
    forceComplete?: boolean,
    config?: Omit<RequestConfig, 'sid'>,
  ): Promise<TaskActionResult[]> {
    const version = registry.getNegotiatedVersion(this.apiName, this.maxClientVersion);
    const endpoint = registry.resolveEndpoint(this.apiName);

    const extraParams: Record<string, string | boolean> = {
      id: encodeTaskIds(ids),
      _sid: sid,
    };
    if (forceComplete !== undefined) {
      extraParams.force_complete = forceComplete;
    }

    const params = buildSynoParams(this.apiName, version, 'delete', extraParams);

    const body = buildUrlEncodedBody(params);
    return this.httpClient.post<TaskActionResult[]>(baseUrl, endpoint, body, {
      ...config,
      sid,
    });
  }
}
