import { Router, Request, Response } from 'express';
import DatabaseService from '../services/database';

const router = Router();

export function createHealthRoutes(db: DatabaseService) {
  // GET /health - Basic health check
  router.get('/', async (req: Request, res: Response) => {
    try {
      // Test database connection
      await db.query('SELECT 1 as test');
      
      res.json({
        status: 'healthy',
        service: 'tenant-service',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        database: 'connected',
        uptime: process.uptime()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        service: 'tenant-service',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      });
    }
  });

  // GET /health/ready - Readiness probe
  router.get('/ready', async (req: Request, res: Response) => {
    try {
      // Check if service is ready to accept requests
      await db.query('SELECT COUNT(*) as count FROM tenants LIMIT 1');
      
      res.json({
        status: 'ready',
        service: 'tenant-service',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Readiness check failed:', error);
      res.status(503).json({
        status: 'not-ready',
        service: 'tenant-service',
        timestamp: new Date().toISOString(),
        error: 'Service not ready'
      });
    }
  });

  // GET /health/live - Liveness probe
  router.get('/live', (req: Request, res: Response) => {
    res.json({
      status: 'alive',
      service: 'tenant-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  });

  return router;
}