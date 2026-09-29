import * as http from 'node:http';
import * as url from 'node:url';
import type { DownloadTask, DownloadStationConfig } from '../../../src/core/synology/download-station/types';
import type { ParsedUrlQuery } from 'querystring';

export class MockNasServer {
  private server: http.Server;
  private port: number;
  public state: {
    authStatus: 'SUCCESS' | 'OTP_REQUIRED' | 'INVALID_CREDENTIALS' | 'SESSION_EXPIRED';
    tasks: DownloadTask[];
    statistics: Record<string, unknown>;
    requireDeviceToken: boolean;
    validDid: string | null;
    isManager: boolean;
    config: DownloadStationConfig;
  };
  public uploads: Array<{ name: string; bytes: Buffer; destination: string; sid: string }> = [];
  public requestCounts: Record<string, number> = {};

  constructor(port: number = 0) {
    this.port = port;
    this.state = {
      authStatus: 'SUCCESS',
      tasks: [],
      statistics: { speed_download: 0, speed_upload: 0 },
      requireDeviceToken: false,
      validDid: 'test-valid-did',
      isManager: true,
      config: { bt_max_download: 0, bt_max_upload: 20, http_max_download: 0, ftp_max_download: 0, nzb_max_download: 0, default_destination: '/volume1/downloads', emule_enabled: false, emule_max_download: 0, emule_max_upload: 0, unzip_service_enabled: false },
    };
    this.requestCounts = {};

    this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {});
        res.end();
        return;
      }

      const parsedUrl = url.parse(req.url || '', true) as url.UrlWithParsedQuery & {
        searchParams: URLSearchParams;
      };
      parsedUrl.searchParams = new URLSearchParams(parsedUrl.search || '');
      const api = parsedUrl.searchParams.get('api') || '';
      const method = parsedUrl.searchParams.get('method') || '';

      console.log(`[MockNas] Request: ${api} ${method} (authStatus: ${this.state.authStatus})`);

      if (api) {
        this.requestCounts[api] = (this.requestCounts[api] || 0) + 1;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        const query = parsedUrl.query;
        const body = Buffer.concat(chunks);
        const boundary = req.headers['content-type']?.match(/boundary=(?:"([^"]+)"|([^;]+))/);
        const params = new URLSearchParams(boundary ? '' : body.toString());
        let upload: { name: string; bytes: Buffer } | undefined;
        if (boundary) {
          for (const part of body.toString('latin1').split(`--${boundary[1] || boundary[2]}`)) {
            const separator = part.indexOf('\r\n\r\n');
            if (separator < 0) continue;
            const header = part.slice(0, separator);
            const name = header.match(/name="([^"]+)"/)?.[1];
            const filename = header.match(/filename="([^"]+)"/)?.[1];
            const value = part.slice(separator + 4).replace(/\r\n$/, '');
            if (filename) upload = { name: filename, bytes: Buffer.from(value, 'latin1') };
            else if (name) params.set(name, Buffer.from(value, 'latin1').toString());
          }
        }
        const api = query.api || params.get('api') || '';
        const method = query.method || params.get('method') || '';
        if (!query.api && api) this.requestCounts[String(api)] = (this.requestCounts[String(api)] || 0) + 1;
        if (upload) {
          this.uploads.push({ ...upload, destination: String(query.destination || params.get('destination') || ''), sid: String(query._sid || params.get('_sid') || '') });
          params.set('uploaded_file_name', upload.name);
        }

        res.setHeader('Content-Type', 'application/json');

        try {
          const responsePayload = this.handleRequest(
            api as string,
            method as string,
            query,
            params,
          );
          console.log(
            `[MockNas] Request: ${api} ${method} -> ${JSON.stringify(responsePayload).slice(0, 100)}`,
          );
          res.writeHead(200);
          res.end(JSON.stringify(responsePayload));
        } catch (error) {
          console.error('Mock server error:', error);
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: { code: 999 } }));
        }
      });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, '127.0.0.1', () => {
        const address = this.server.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
        }
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  public getUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  public reset(): void {
    this.state = {
      authStatus: 'SUCCESS',
      tasks: [],
      statistics: { speed_download: 0, speed_upload: 0 },
      requireDeviceToken: false,
      validDid: 'test-valid-did',
      isManager: true,
      config: { bt_max_download: 0, bt_max_upload: 20, http_max_download: 0, ftp_max_download: 0, nzb_max_download: 0, default_destination: '/volume1/downloads', emule_enabled: false, emule_max_download: 0, emule_max_upload: 0, unzip_service_enabled: false },
    };
    this.requestCounts = {};
    this.uploads = [];
  }

  private handleRequest(
    api: string,
    method: string,
    query: ParsedUrlQuery,
    postParams: URLSearchParams,
  ) {
    if (api === 'SYNO.API.Info' && method === 'query') {
      return {
        success: true,
        data: {
          'SYNO.API.Auth': { maxVersion: 7, minVersion: 1, path: 'auth.cgi' },
          'SYNO.DownloadStation.Task': {
            maxVersion: 3,
            minVersion: 1,
            path: 'DownloadStation/task.cgi',
          },
          'SYNO.DownloadStation.Info': {
            maxVersion: 2,
            minVersion: 1,
            path: 'DownloadStation/info.cgi',
          },
          'SYNO.DownloadStation.Statistic': {
            maxVersion: 1,
            minVersion: 1,
            path: 'DownloadStation/statistic.cgi',
          },
          'SYNO.FileStation.List': {
            maxVersion: 2,
            minVersion: 1,
            path: 'FileStation/file_share.cgi',
          },
        },
      };
    }

    if (api === 'SYNO.API.Auth' && method === 'login') {
      const otpCode = query.otp_code || postParams.get('otp_code');
      const did = query.device_id || postParams.get('device_id');

      if (this.state.authStatus === 'INVALID_CREDENTIALS')
        return { success: false, error: { code: 400 } };
      if (this.state.authStatus === 'OTP_REQUIRED') {
        if (!otpCode) {
          if (this.state.validDid && did === this.state.validDid) {
            return { success: true, data: { sid: 'mock-sid-123', did: this.state.validDid } };
          }
          return { success: false, error: { code: 403 } };
        }
        if (otpCode !== '123456') return { success: false, error: { code: 404 } };
        return { success: true, data: { sid: 'mock-sid-123', did: 'test-valid-did' } };
      }
      return { success: true, data: { sid: 'mock-sid-123', did: 'test-valid-did' } };
    }

    if (api === 'SYNO.API.Auth' && method === 'logout') return { success: true };

    if (this.state.authStatus === 'SESSION_EXPIRED')
      return { success: false, error: { code: 119 } };

    if (api === 'SYNO.DownloadStation.Info' && method === 'getinfo') {
      return { success: true, data: { is_manager: this.state.isManager, version: 2 } };
    }

    if (api === 'SYNO.DownloadStation.Info' && method === 'getconfig') return { success: true, data: this.state.config };
    if (api === 'SYNO.DownloadStation.Info' && method === 'setserverconfig') {
      if (!this.state.isManager) return { success: false, error: { code: 105 } };
      for (const key of ['bt_max_download', 'bt_max_upload', 'http_max_download', 'nzb_max_download'] as const) {
        const value = postParams.get(key);
        if (value !== null) this.state.config[key] = Number(value);
      }
      this.state.config.ftp_max_download = this.state.config.http_max_download;
      return { success: true };
    }

    if (api === 'SYNO.DownloadStation.Task') {
      if (method === 'list') {
        return { success: true, data: { tasks: this.state.tasks, total: this.state.tasks.length } };
      }
      if (method === 'create') {
        const uri = (query.uri as string) || postParams.get('uri') || '';
        const destination = (query.destination as string) || postParams.get('destination') || '';
        const newId = `dbid_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Derive title from URI (naive logic for mock)
        let title = postParams.get('uploaded_file_name') || 'mock-task';
        if (uri) {
          const match = uri.match(/dn=([^&]+)/);
          if (match && match[1]) {
            title = decodeURIComponent(match[1]);
          } else {
            title = uri.split('/').pop() || 'mock-task';
          }
        }

        this.state.tasks.push({
          id: newId,
          title: title,
          status: 'downloading',
          type: uri?.startsWith('magnet') ? 'bt' : 'http',
          username: 'admin',
          size: 1024,
          additional: {
            detail: {
              uri: uri || '',
              destination: destination || '',
              create_time: Math.floor(Date.now() / 1000),
              started_time: Math.floor(Date.now() / 1000),
              completed_time: 0,
              priority: 'auto',
            },
          },
        });

        return { success: true };
      }
      if (method === 'delete') {
        const idsParam = (query.id as string) || postParams.get('id');
        if (idsParam) {
          const idsToDelete = idsParam.split(',');
          this.state.tasks = this.state.tasks.filter((t) => !idsToDelete.includes(t.id));
        }
        return { success: true, data: [] };
      }
      if (method === 'pause') {
        const idsParam = (query.id as string) || postParams.get('id');
        if (idsParam) {
          const idsToPause = idsParam.split(',');
          this.state.tasks = this.state.tasks.map((t) =>
            idsToPause.includes(t.id) ? { ...t, status: 'paused' } : t,
          );
        }
        return { success: true };
      }
      if (method === 'resume') {
        const idsParam = (query.id as string) || postParams.get('id');
        if (idsParam) {
          const idsToResume = idsParam.split(',');
          this.state.tasks = this.state.tasks.map((t) =>
            idsToResume.includes(t.id) ? { ...t, status: 'downloading' } : t,
          );
        }
        return { success: true };
      }
    }

    if (api === 'SYNO.DownloadStation.Statistic' && method === 'getinfo') {
      return { success: true, data: this.state.statistics };
    }

    if (api === 'SYNO.FileStation.List') {
      if (method === 'list_share') {
        return {
          success: true,
          data: { shares: [{ path: '/volume1/downloads', name: 'downloads', isdir: true }] },
        };
      }
      if (method === 'list') {
        const folderPath = (query.folder_path as string) || postParams.get('folder_path') || '';
        // Mock successful list if path is valid, else return missing
        if (folderPath === '/volume1/downloads' || folderPath.startsWith('/volume1/downloads/')) {
          return { success: true, data: { files: [] } };
        }
        return { success: false, error: { code: 408 } }; // 408 is No Such File or Directory in File Station
      }
    }

    return { success: false, error: { code: 101, message: 'API/Method not mocked' } };
  }
}
