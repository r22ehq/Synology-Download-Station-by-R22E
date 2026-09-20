export interface SynologyError {
  code: number;
  message?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    sid: string;
    did?: string;
  };
  error?: SynologyError;
}

export interface TaskDetail {
  uri: string;
  destination: string;
}

export interface TaskInfo {
  id: string;
  title: string;
  status: string;
  size?: number;
  total_size?: number;
  downloaded?: number;
  additional?: {
    detail?: TaskDetail;
    transfer?: {
      size_downloaded?: number;
      [key: string]: unknown;
    };
  };
}

export interface TaskListApiResponse {
  success: boolean;
  data?: {
    tasks: TaskInfo[];
    total: number;
  };
  error?: SynologyError;
}

export interface FileStationShare {
  path: string;
  name: string;
  isdir: boolean;
}

export interface FileStationListResponse {
  success: boolean;
  data?: {
    shares?: FileStationShare[];
    files?: FileStationShare[];
  };
  error?: SynologyError;
}

export interface EmptySuccessResponse {
  success: boolean;
  error?: SynologyError;
}
