export type TaskStatus =
  | 'waiting'
  | 'downloading'
  | 'paused'
  | 'finishing'
  | 'finished'
  | 'hash_checking'
  | 'seeding'
  | 'filehosting'
  | 'extracting'
  | 'error';

export type TaskType = 'bt' | 'emule' | 'http' | 'ftp' | 'nzb';

export interface TaskDetail {
  destination: string;
  uri: string;
  create_time: number;
  started_time: number;
  completed_time: number;
  priority: 'auto' | 'low' | 'normal' | 'high';
  unzip_password?: string;
  total_peers?: number;
  connected_seeders?: number;
  connected_leechers?: number;
}

export interface TaskTransfer {
  size_downloaded: number;
  size_uploaded: number;
  speed_download: number;
  speed_upload: number;
}

export interface TaskFile {
  filename: string;
  size: number;
  size_downloaded: number;
  priority: 'skip' | 'low' | 'normal' | 'high';
  wanted: boolean;
}

export interface TaskTracker {
  url: string;
  status: string;
  seeds: number;
  peers: number;
}

export interface TaskPeer {
  address: string;
  agent: string;
  progress: number;
  speed: number;
}

export interface DownloadTask {
  id: string;
  type: TaskType;
  username: string;
  title: string;
  size: number;
  status: TaskStatus;
  status_extra?: {
    error_detail?: string;
    unzip_progress?: number;
  };
  additional?: {
    detail?: TaskDetail;
    transfer?: TaskTransfer;
    file?: TaskFile[];
    tracker?: TaskTracker[];
    peer?: TaskPeer[];
  };
}

export interface TaskListResponse {
  offset: number;
  total: number;
  tasks: DownloadTask[];
}

export interface DownloadStationInfo {
  is_manager: boolean;
  version: number;
  version_string: string;
}

export interface DownloadStationConfig {
  bt_max_download: number;
  bt_max_upload: number;
  emule_enabled: boolean;
  emule_max_download: number;
  emule_max_upload: number;
  unzip_service_enabled: boolean;
  default_destination: string;
}

export interface DownloadStationStatistic {
  speed_download: number;
  speed_upload: number;
  emule_speed_download: number;
  emule_speed_upload: number;
}

export interface TaskCreateOptions {
  uri?: string[];
  destination?: string;
  username?: string;
  password?: string;
  unzip_password?: string;
  file?: Blob;
}

export interface TaskActionResult {
  id: string;
  error: number;
}

export const DSTaskErrorCodes = {
  FILE_NOT_EXIST: 400,
  TASK_ALREADY_EXIST: 401,
  DESTINATION_NOT_EXIST: 402,
  DESTINATION_NOT_DIRECTORY: 403,
  INVALID_TASK_ID: 404,
  INVALID_TASK_ACTION: 405,
  NO_DEFAULT_DESTINATION: 406,
  SET_DESTINATION_ERROR: 407,
  FILE_DOWNLOAD_FAILED: 408,
} as const;
