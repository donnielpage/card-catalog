import { Router, Response } from 'express';
import { SystemService } from '../services/systemService';
import { createAuthMiddleware, createRateLimitMiddleware } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

export function createSystemRoutes(systemService: SystemService, jwtSecret: string) {
  // Apply authentication middleware - require global admin for all system operations
  const authMiddleware = createAuthMiddleware({ jwtSecret, requireGlobalAdmin: true });
  const rateLimitMiddleware = createRateLimitMiddleware();
  
  router.use(authMiddleware);
  router.use(rateLimitMiddleware);

  // GET /system/info - Get system information
  router.get('/info', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const systemInfo = await systemService.getSystemInfo();
      
      res.json({
        success: true,
        data: systemInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get system info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system information'
      });
    }
  });

  // GET /system/version - Get version information
  router.get('/version', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const systemInfo = await systemService.getSystemInfo();
      
      res.json({
        success: true,
        data: {
          version: systemInfo.version,
          nodeVersion: systemInfo.nodeVersion,
          platform: systemInfo.platform,
          uptime: systemInfo.uptime
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get version error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve version information'
      });
    }
  });

  // GET /system/services - Get service health status
  router.get('/services', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const services = await systemService.checkAllServices();
      
      const healthySvcs = services.filter(s => s.status === 'healthy').length;
      const totalSvcs = services.length;
      
      res.json({
        success: true,
        data: {
          services,
          summary: {
            total: totalSvcs,
            healthy: healthySvcs,
            unhealthy: totalSvcs - healthySvcs,
            overallStatus: healthySvcs === totalSvcs ? 'healthy' : 'degraded'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service status'
      });
    }
  });

  // GET /system/storage - Get storage information
  router.get('/storage', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const storageInfo = await systemService.getStorageInfo();
      
      res.json({
        success: true,
        data: storageInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get storage info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve storage information'
      });
    }
  });

  // GET /system/changelog - Get changelog
  router.get('/changelog', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const changelog = systemService.getChangelog();
      const limit = parseInt(req.query.limit as string) || 10;
      
      res.json({
        success: true,
        data: {
          entries: changelog.slice(0, limit),
          total: changelog.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get changelog error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve changelog'
      });
    }
  });

  // GET /system/backup - Get backup list
  router.get('/backup', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const backups = await systemService.getBackups();
      
      res.json({
        success: true,
        data: {
          backups,
          count: backups.length,
          totalSize: backups.reduce((sum, backup) => sum + backup.size, 0)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get backups error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve backup list'
      });
    }
  });

  // POST /system/backup - Create new backup
  router.post('/backup', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const backup = await systemService.createBackup();
      
      res.status(201).json({
        success: true,
        message: 'Backup created successfully',
        data: backup,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Create backup error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create backup';
      res.status(500).json({
        success: false,
        error: message
      });
    }
  });

  // GET /system/metrics - Get system metrics
  router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const systemInfo = await systemService.getSystemInfo();
      const services = await systemService.checkAllServices();
      const storage = await systemService.getStorageInfo();
      
      const metrics = {
        system: {
          uptime: systemInfo.uptime,
          memory: systemInfo.memory,
          disk: systemInfo.disk
        },
        services: {
          total: services.length,
          healthy: services.filter(s => s.status === 'healthy').length,
          averageResponseTime: services
            .filter(s => s.responseTime)
            .reduce((sum, s) => sum + (s.responseTime || 0), 0) / services.length
        },
        storage: {
          totalFiles: storage.uploads.count + storage.backups.count + storage.logs.count,
          totalSize: storage.uploads.totalSize + storage.backups.totalSize + 
                    storage.logs.totalSize + storage.database.size
        }
      };
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics'
      });
    }
  });

  return router;
}