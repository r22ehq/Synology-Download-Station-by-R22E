export interface SharedFolder {
  name: string;
  path: string;
  additional?: Record<string, unknown>;
}

export interface FileListItem {
  name: string;
  path: string;
  isdir: boolean;
  additional?: Record<string, unknown>;
}

export interface FileListResponse {
  offset: number;
  total: number;
  files: FileListItem[];
}

export interface ShareListResponse {
  offset: number;
  total: number;
  shares: SharedFolder[];
}
