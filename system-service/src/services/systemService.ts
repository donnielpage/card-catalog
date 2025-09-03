import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { readFileSync, statSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SystemInfo, ServiceStatus, BackupInfo, ChangelogEntry, StorageInfo, ServiceConfig } from '../types';

const execAsync = promisify(exec);

export class SystemService {
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const packageJson = this.getPackageInfo();
    const memoryInfo = process.memoryUsage();
    const diskInfo = await this.getDiskInfo();
    const serviceStatuses = await this.checkAllServices();

    return {
      version: packageJson.version || '1.0.0',
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      uptime: process.uptime(),
      memory: {
        used: memoryInfo.heapUsed,
        total: memoryInfo.heapTotal,
        free: memoryInfo.heapTotal - memoryInfo.heapUsed
      },
      disk: diskInfo,
      services: serviceStatuses
    };
  }

  async checkAllServices(): Promise<ServiceStatus[]> {
    const services = [
      { name: 'main-app', url: this.config.services.mainApp },
      { name: 'media-service', url: this.config.services.mediaService },
      { name: 'reference-service', url: this.config.services.referenceService },
      { name: 'user-service', url: this.config.services.userService }
    ];

    const statuses = await Promise.allSettled(
      services.map(service => this.checkServiceHealth(service.name, service.url))
    );

    return statuses.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index].name,
          url: services[index].url,
          status: 'unhealthy' as const,
          lastCheck: new Date().toISOString()
        };
      }
    });
  }

  private async checkServiceHealth(name: string, url: string): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const healthUrl = url.endsWith('/health') ? url : `${url}/health`;
      const response = await axios.get(healthUrl, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        name,
        url,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        name,
        url,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString()
      };
    }
  }

  private getPackageInfo() {
    try {
      const packagePath = join(process.cwd(), 'package.json');
      return JSON.parse(readFileSync(packagePath, 'utf8'));
    } catch (error) {
      return { version: '1.0.0' };
    }
  }

  private async getDiskInfo() {
    try {
      if (process.platform === 'win32') {
        // Windows disk space check
        const { stdout } = await execAsync('dir /-c');
        const match = stdout.match(/(\d+) bytes free/);
        const free = match ? parseInt(match[1]) : 0;
        return { used: 0, total: 0, free };
      } else {
        // Unix-like systems
        const { stdout } = await execAsync('df -h .');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          const total = this.parseSize(parts[1]);
          const used = this.parseSize(parts[2]);
          const free = this.parseSize(parts[3]);
          return { total, used, free };
        }
      }
    } catch (error) {
      console.error('Failed to get disk info:', error);
    }
    
    return { used: 0, total: 0, free: 0 };
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?)$/i);
    if (!match) return 0;
    
    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers: { [key: string]: number } = {
      '': 1024, // Assume KB if no unit
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024
    };
    
    return Math.round(size * (multipliers[unit] || 1));
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const info: StorageInfo = {
      uploads: { count: 0, totalSize: 0 },
      backups: { count: 0, totalSize: 0 },
      logs: { count: 0, totalSize: 0 },
      database: { size: 0 }
    };

    try {
      // Check uploads directory
      const uploadsPath = join(process.cwd(), '..', 'uploads');
      if (existsSync(uploadsPath)) {
        const uploadStats = this.getDirectoryStats(uploadsPath);
        info.uploads = uploadStats;
      }

      // Check backups directory
      const backupPath = this.config.backupPath;
      if (existsSync(backupPath)) {
        const backupStats = this.getDirectoryStats(backupPath);
        info.backups = backupStats;
      }

      // Check logs directory
      const logsPath = join(process.cwd(), 'logs');
      if (existsSync(logsPath)) {
        const logStats = this.getDirectoryStats(logsPath);
        info.logs = logStats;
      }

      // Estimate database size (would need actual DB connection for accurate size)
      info.database.size = 0; // Placeholder

    } catch (error) {
      console.error('Failed to get storage info:', error);
    }

    return info;
  }

  private getDirectoryStats(dirPath: string): { count: number; totalSize: number } {
    let count = 0;
    let totalSize = 0;

    try {
      const files = readdirSync(dirPath);
      for (const file of files) {
        const filePath = join(dirPath, file);
        try {
          const stats = statSync(filePath);
          if (stats.isFile()) {
            count++;
            totalSize += stats.size;
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      console.error(`Failed to read directory ${dirPath}:`, error);
    }

    return { count, totalSize };
  }

  getChangelog(): ChangelogEntry[] {
    try {
      const changelogPath = join(process.cwd(), '..', 'CHANGELOG.md');
      if (!existsSync(changelogPath)) {
        return [
          {
            version: '1.0.0',
            date: new Date().toISOString().split('T')[0],
            changes: ['Initial release'],
            breaking: false
          }
        ];
      }

      const content = readFileSync(changelogPath, 'utf8');
      return this.parseChangelog(content);
    } catch (error) {
      console.error('Failed to read changelog:', error);
      return [];
    }
  }

  private parseChangelog(content: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const lines = content.split('\n');
    let currentEntry: Partial<ChangelogEntry> | null = null;

    for (const line of lines) {
      const versionMatch = line.match(/^##\s*\[?(\d+\.\d+\.\d+)\]?\s*-\s*(.+)/);
      if (versionMatch) {
        if (currentEntry) {
          entries.push(currentEntry as ChangelogEntry);
        }
        currentEntry = {
          version: versionMatch[1],
          date: versionMatch[2],
          changes: [],
          breaking: false
        };
      } else if (currentEntry && line.match(/^[-*]\s/)) {
        const change = line.replace(/^[-*]\s/, '').trim();
        if (change.toLowerCase().includes('breaking')) {
          currentEntry.breaking = true;
        }
        currentEntry.changes!.push(change);
      }
    }

    if (currentEntry) {
      entries.push(currentEntry as ChangelogEntry);
    }

    return entries;
  }

  async createBackup(): Promise<BackupInfo> {
    const backupId = `backup_${Date.now()}`;
    const filename = `${backupId}.tar.gz`;
    const backupPath = join(this.config.backupPath, filename);

    try {
      // This is a placeholder - would need actual backup logic
      const backupInfo: BackupInfo = {
        id: backupId,
        filename,
        size: 0,
        created: new Date().toISOString(),
        type: 'full',
        status: 'completed'
      };

      return backupInfo;
    } catch (error) {
      throw new Error(`Backup failed: ${error}`);
    }
  }

  async getBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];
    
    try {
      if (!existsSync(this.config.backupPath)) {
        return backups;
      }

      const files = readdirSync(this.config.backupPath);
      for (const file of files) {
        if (file.endsWith('.tar.gz')) {
          const filePath = join(this.config.backupPath, file);
          const stats = statSync(filePath);
          
          backups.push({
            id: file.replace('.tar.gz', ''),
            filename: file,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            type: 'full',
            status: 'completed'
          });
        }
      }
    } catch (error) {
      console.error('Failed to get backups:', error);
    }

    return backups.sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }
}