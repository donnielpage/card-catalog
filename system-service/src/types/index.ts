import { Request } from 'express';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  tenantId: string;
  globalRole?: 'global_admin' | 'tenant_admin' | 'user';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    free: number;
  };
  disk: {
    used: number;
    total: number;
    free: number;
  };
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  created: string;
  type: 'full' | 'incremental';
  status: 'completed' | 'running' | 'failed';
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  breaking?: boolean;
}

export interface StorageInfo {
  uploads: {
    count: number;
    totalSize: number;
  };
  backups: {
    count: number;
    totalSize: number;
  };
  logs: {
    count: number;
    totalSize: number;
  };
  database: {
    size: number;
  };
}

export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  corsOrigin: string;
  services: {
    mainApp: string;
    mediaService: string;
    referenceService: string;
    userService: string;
  };
  backupPath: string;
}