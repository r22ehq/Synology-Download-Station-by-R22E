import type { RequestConfig } from '../types';
import { parseSynoResponse } from './response-parser';

export class SynoHttpClient {
  private defaultTimeout = 30000; // 30s

  public buildUrl(
    baseUrl: string,
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`webapi/${path.replace(/^\//, '')}`, baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  public async get<T>(baseUrl: string, path: string, config?: RequestConfig): Promise<T> {
    const params = { ...config?.params };
    if (config?.sid) {
      params._sid = config.sid;
    }

    const url = this.buildUrl(baseUrl, path, params);

    const headers = new Headers(config?.headers);
    if (config?.synoToken) {
      headers.set('X-SYNO-TOKEN', config.synoToken);
    }

    return this.executeRequest<T>(url, {
      method: 'GET',
      headers,
      signal: config?.signal,
      timeout: config?.timeout,
    });
  }

  public async post<T>(
    baseUrl: string,
    path: string,
    body: FormData | URLSearchParams,
    config?: RequestConfig,
  ): Promise<T> {
    const url = this.buildUrl(baseUrl, path, config?.sid ? { _sid: config.sid } : undefined);

    const headers = new Headers(config?.headers);
    if (config?.synoToken) {
      headers.set('X-SYNO-TOKEN', config.synoToken);
    }

    return this.executeRequest<T>(url, {
      method: 'POST',
      headers,
      body,
      signal: config?.signal,
      timeout: config?.timeout,
    });
  }

  private async executeRequest<T>(
    url: string,
    options: {
      method: string;
      headers: Headers;
      body?: BodyInit;
      signal?: AbortSignal;
      timeout?: number;
    },
  ): Promise<T> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      options.timeout ?? this.defaultTimeout,
    );

    // Wire up parent signal if provided
    const parentSignal = options.signal;
    if (parentSignal) {
      parentSignal.addEventListener('abort', () => abortController.abort());
      if (parentSignal.aborted) abortController.abort();
    }

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: abortController.signal,
        credentials: 'omit',
      });

      return await parseSynoResponse<T>(response);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout or aborted: ${url}`, { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', () => abortController.abort());
      }
    }
  }
}
