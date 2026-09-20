import http from 'http';
import url from 'url';

export class MockNasServer {
  private server: http.Server;
  private port: number;
  public state: {
    authStatus: 'SUCCESS' | 'OTP_REQUIRED' | 'INVALID_CREDENTIALS' | 'SESSION_EXPIRED';
    tasks: any[];
    statistics: any;
    requireDeviceToken: boolean;
    validDid: string | null;
  };
  public requestCounts: Record<string, number> = {};

  constructor(port: number = 0) {
    this.port = port;
    this.state = {
      authStatus: 'SUCCESS',
      tasks: [],
      statistics: { speed_download: 0, speed_upload: 0 },
      requireDeviceToken: false,
      validDid: 'test-valid-did',
    };
    this.requestCounts = {};

    this.server = http.createServer((req: any, res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        const headers = {};
        res.writeHead(204, headers);
        res.end();
        return;
      }
      
      console.log(`[MOCK NAS] ${req.method} ${req.url}`);

      const parsedUrl = url.parse(req.url || '', true);
      const pathname = parsedUrl.pathname || '';
      this.requestCounts[pathname] = (this.requestCounts[pathname] || 0) + 1;
      
      let body = '';
      req.on('data', (chunk: any) => { body += chunk.toString(); });
      req.on('end', () => {
        const query = parsedUrl.query;
        // Merge POST body as query (simplified for mock)
        let params = new URLSearchParams(body || '');
        const api = query.api || params.get('api') || '';
        const method = query.method || params.get('method') || '';

        res.setHeader('Content-Type', 'application/json');

        try {
          const responsePayload = this.handleRequest(api as string, method as string, query, params);
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
    };
    this.requestCounts = {};
  }

  private handleRequest(api: string, method: string, query: any, postParams: URLSearchParams) {
    if (api === 'SYNO.API.Info' && method === 'query') {
      return {
        success: true,
        data: {
          'SYNO.API.Auth': { maxVersion: 7, minVersion: 1, path: 'auth.cgi' },
          'SYNO.DownloadStation.Task': { maxVersion: 3, minVersion: 1, path: 'DownloadStation/task.cgi' },
          'SYNO.DownloadStation.Info': { maxVersion: 2, minVersion: 1, path: 'DownloadStation/info.cgi' },
          'SYNO.DownloadStation.Statistic': { maxVersion: 1, minVersion: 1, path: 'DownloadStation/statistic.cgi' },
          'SYNO.FileStation.List': { maxVersion: 2, minVersion: 1, path: 'FileStation/file_share.cgi' }
        }
      };
    }

    if (api === 'SYNO.API.Auth' && method === 'login') {
      const otpCode = query.otp_code || postParams.get('otp_code');
      const did = query.device_id || postParams.get('device_id');
      
      if (this.state.authStatus === 'INVALID_CREDENTIALS') {
        return { success: false, error: { code: 400 } };
      }
      
      if (this.state.authStatus === 'OTP_REQUIRED') {
        if (!otpCode) {
          if (this.state.validDid && did === this.state.validDid) {
             // Valid remembered device bypasses OTP
             return { success: true, data: { sid: 'mock-sid-123', did: this.state.validDid } };
          }
          return { success: false, error: { code: 403 } }; // 403 is OTP required in Synology
        }
        if (otpCode !== '123456') {
          return { success: false, error: { code: 404 } }; // Mocking wrong OTP
        }
        return { success: true, data: { sid: 'mock-sid-123', did: 'test-valid-did' } };
      }

      return { success: true, data: { sid: 'mock-sid-123', did: 'test-valid-did' } };
    }

    if (api === 'SYNO.API.Auth' && method === 'logout') {
      return { success: true };
    }

    // Require Auth for DS API
    // const _sid = query._sid || postParams.get('_sid');
    // We could strictly enforce _sid check here if we want, but for now we'll allow it if authStatus isn't SESSION_EXPIRED
    if (this.state.authStatus === 'SESSION_EXPIRED') {
      return { success: false, error: { code: 119 } }; // 119 = session expired
    }

    if (api === 'SYNO.DownloadStation.Task') {
      if (method === 'list') {
        return { success: true, data: { tasks: this.state.tasks, total: this.state.tasks.length } };
      }
      if (method === 'create') {
        return { success: true };
      }
    }

    if (api === 'SYNO.DownloadStation.Statistic' && method === 'getinfo') {
      return { success: true, data: this.state.statistics };
    }

    if (api === 'SYNO.FileStation.List' && method === 'list_share') {
      return { success: true, data: { shares: [{ path: '/volume1/downloads', name: 'downloads', isdir: true }] } };
    }

    return { success: false, error: { code: 101, message: 'API/Method not mocked' } };
  }
}
