import * as http from 'node:http';
import * as url from 'node:url';
import type { DownloadTask } from '../../../src/core/synology/download-station/types';
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

    this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {});
        res.end();
        return;
      }
      
      const parsedUrl = url.parse(req.url || '', true);
      const pathname = parsedUrl.pathname || '';
      this.requestCounts[pathname] = (this.requestCounts[pathname] || 0) + 1;
      
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => {
        const query = parsedUrl.query;
        const params = new URLSearchParams(body || '');
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

  private handleRequest(api: string, method: string, query: ParsedUrlQuery, postParams: URLSearchParams) {
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
      
      if (this.state.authStatus === 'INVALID_CREDENTIALS') return { success: false, error: { code: 400 } };
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

    if (this.state.authStatus === 'SESSION_EXPIRED') return { success: false, error: { code: 119 } };

    if (api === 'SYNO.DownloadStation.Task') {
      if (method === 'list') {
        return { success: true, data: { tasks: this.state.tasks, total: this.state.tasks.length } };
      }
      if (method === 'create') {
        const uri = (query.uri as string) || postParams.get('uri') || '';
        const destination = (query.destination as string) || postParams.get('destination') || '';
        const newId = `dbid_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Derive title from URI (naive logic for mock)
        let title = 'mock-task';
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
              priority: 'auto' 
            } 
          }
        });
        
        return { success: true };
      }
      if (method === 'delete') {
        const idsParam = (query.id as string) || postParams.get('id');
        if (idsParam) {
          const idsToDelete = idsParam.split(',');
          this.state.tasks = this.state.tasks.filter(t => !idsToDelete.includes(t.id));
        }
        return { success: true, data: [] };
      }
      if (method === 'pause') {
        const idsParam = (query.id as string) || postParams.get('id');
        if (idsParam) {
          const idsToPause = idsParam.split(',');
          this.state.tasks = this.state.tasks.map(t => idsToPause.includes(t.id) ? { ...t, status: 'paused' } : t);
        }
        return { success: true };
      }
      if (method === 'resume') {
        const idsParam = (query.id as string) || postParams.get('id');
        if (idsParam) {
          const idsToResume = idsParam.split(',');
          this.state.tasks = this.state.tasks.map(t => idsToResume.includes(t.id) ? { ...t, status: 'downloading' } : t);
        }
        return { success: true };
      }
    }

    if (api === 'SYNO.DownloadStation.Statistic' && method === 'getinfo') {
      return { success: true, data: this.state.statistics };
    }

    if (api === 'SYNO.FileStation.List') {
      if (method === 'list_share') {
        return { success: true, data: { shares: [{ path: '/volume1/downloads', name: 'downloads', isdir: true }] } };
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
