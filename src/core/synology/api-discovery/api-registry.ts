import type { SynoApiInfo } from '../types';

export interface ApiCapability {
  minVersion: number;
  maxVersion: number;
  selectedVersion: number;
  supported: boolean;
}

export interface NasCapabilities {
  auth: ApiCapability;
  dsInfo: ApiCapability;
  dsStatistic: ApiCapability;
  dsTask: ApiCapability;
  ds2Task: ApiCapability;
  ds2TaskList: ApiCapability;
  ds2TaskListPolling: ApiCapability;
  ds2TaskBt: ApiCapability;
  ds2TaskBtFile: ApiCapability;
  ds2TaskComplete: ApiCapability;
  fsInfo: ApiCapability;
  fsList: ApiCapability;
}

export class ApiRegistry {
  private apis: Map<string, SynoApiInfo> = new Map();
  private caps?: NasCapabilities;

  constructor(_baseUrl: string) {
    // baseUrl stored for potential future use in endpoint resolution
  }

  public register(apiName: string, info: SynoApiInfo): void {
    this.apis.set(apiName, info);
  }

  private buildCapability(apiName: string, maxRequested: number): ApiCapability {
    const info = this.apis.get(apiName);
    if (!info) return { minVersion: 0, maxVersion: 0, selectedVersion: 0, supported: false };
    return {
      minVersion: info.minVersion,
      maxVersion: info.maxVersion,
      selectedVersion: Math.max(info.minVersion, Math.min(info.maxVersion, maxRequested)),
      supported: true
    };
  }

  public getCapabilities(): NasCapabilities {
    if (!this.caps) {
      this.caps = {
        auth: this.buildCapability('SYNO.API.Auth', 7),
        dsInfo: this.buildCapability('SYNO.DownloadStation.Info', 2),
        dsStatistic: this.buildCapability('SYNO.DownloadStation.Statistic', 1),
        dsTask: this.buildCapability('SYNO.DownloadStation.Task', 2),
        ds2Task: this.buildCapability('SYNO.DownloadStation2.Task', 2),
        ds2TaskList: this.buildCapability('SYNO.DownloadStation2.Task.List', 2),
        ds2TaskListPolling: this.buildCapability('SYNO.DownloadStation2.Task.List.Polling', 1),
        ds2TaskBt: this.buildCapability('SYNO.DownloadStation2.Task.BT', 1),
        ds2TaskBtFile: this.buildCapability('SYNO.DownloadStation2.Task.BT.File', 1),
        ds2TaskComplete: this.buildCapability('SYNO.DownloadStation2.Task.Complete', 1),
        fsInfo: this.buildCapability('SYNO.FileStation.Info', 2),
        fsList: this.buildCapability('SYNO.FileStation.List', 2),
      };
    }
    return this.caps;
  }

  public get(apiName: string): SynoApiInfo | undefined {
    return this.apis.get(apiName);
  }

  public resolveEndpoint(apiName: string): string {
    const info = this.get(apiName);
    if (!info) {
      throw new Error(`API ${apiName} not discovered or not available on this Synology NAS`);
    }
    return info.path;
  }

  public getNegotiatedVersion(apiName: string, maxSupportedByClient: number): number {
    const info = this.get(apiName);
    if (!info) {
      throw new Error(`API ${apiName} not discovered`);
    }
    return Math.min(info.maxVersion, maxSupportedByClient);
  }

  public isAvailable(apiName: string): boolean {
    return this.apis.has(apiName);
  }

  public clear(): void {
    this.apis.clear();
  }
}
