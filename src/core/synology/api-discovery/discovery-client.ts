import { SynoHttpClient } from '../transport/http-client';
import { buildSynoParams } from '../transport/request-builder';
import { ApiRegistry } from './api-registry';
import type { SynoApiInfo } from '../types';

interface QueryResponse {
  [apiName: string]: SynoApiInfo;
}

export class DiscoveryClient {
  private httpClient: SynoHttpClient;
  private registries: Map<string, ApiRegistry> = new Map();

  constructor(httpClient: SynoHttpClient) {
    this.httpClient = httpClient;
  }

  public async discoverApis(baseUrl: string, apis?: string[]): Promise<ApiRegistry> {
    if (this.registries.has(baseUrl)) {
      return this.registries.get(baseUrl)!;
    }

    const queryApiStr = apis && apis.length > 0 ? apis.join(',') : 'all';
    const params = buildSynoParams('SYNO.API.Info', 1, 'query', { query: queryApiStr });

    const response = await this.httpClient.get<QueryResponse>(baseUrl, 'query.cgi', { params });

    const registry = new ApiRegistry(baseUrl);

    Object.entries(response).forEach(([apiName, info]) => {
      registry.register(apiName, info);
    });

    this.registries.set(baseUrl, registry);
    return registry;
  }

  public clearCache(baseUrl?: string): void {
    if (baseUrl) {
      this.registries.delete(baseUrl);
    } else {
      this.registries.clear();
    }
  }
}
