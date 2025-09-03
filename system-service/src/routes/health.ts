import { Router, Request, Response } from 'express';

const router = Router();

export function createHealthRoutes() {
  // GET /health - Basic health check
  router.get('/', (req: Request, res: Response) => {
    try {
      res.json({
        status: 'healthy',
        service: 'system-service',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        service: 'system-service',
        timestamp: new Date().toISOString(),
        error: 'Service unhealthy'
      });
    }
  });

  // GET /health/ready - Readiness probe
  router.get('/ready', (req: Request, res: Response) => {
    try {
      // Check if service is ready to accept requests
      const isReady = process.uptime() > 5; // Service ready after 5 seconds
      
      if (isReady) {
        res.json({
          status: 'ready',
          service: 'system-service',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not-ready',
          service: 'system-service',
          timestamp: new Date().toISOString(),
          error: 'Service starting up'
        });
      }
    } catch (error) {
      console.error('Readiness check failed:', error);
      res.status(503).json({
        status: 'not-ready',
        service: 'system-service',
        timestamp: new Date().toISOString(),
        error: 'Service not ready'
      });
    }
  });

  // GET /health/live - Liveness probe
  router.get('/live', (req: Request, res: Response) => {
    res.json({
      status: 'alive',
      service: 'system-service',
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