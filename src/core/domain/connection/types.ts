export interface NasConnectionConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  name?: string;
}

export interface NasProfile {
  id: string;
  name: string;
  config: NasConnectionConfig;
  defaultDestination?: string;
  // Auth details like username might be here, but passwords typically in secure storage
  username: string;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  AUTH_FAILED = 'AUTH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export interface ConnectionDiagnostic {
  status: ConnectionStatus;
  latencyMs?: number;
  message?: string;
  lastChecked?: number;
}
