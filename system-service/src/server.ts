import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import winston from 'winston';
import { SystemService } from './services/systemService';
import { createSystemRoutes } from './routes/system';
import { createHealthRoutes } from './routes/health';
import { ServiceConfig } from './types';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Service configuration
const config: ServiceConfig = {
  port: parseInt(process.env.PORT || '3004'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  services: {
    mainApp: process.env.MAIN_APP_URL || 'http://localhost:3000',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3001',
    referenceService: process.env.REFERENCE_SERVICE_URL || 'http://localhost:3002',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3003'
  },
  backupPath: process.env.BACKUP_PATH || './backups'
};

async function startServer() {
  try {
    // Initialize system service
    const systemService = new SystemService(config);

    // Create Express app
    const app = express();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: false // Allow for API usage
    }));

    // Compression middleware
    app.use(compression());

    // CORS configuration
    app.use(cors({
      origin: config.corsOrigin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        userAgent: req.get('user-agent'),
        ip: req.ip
      });
      next();
    });

    // Health check routes
    app.use('/health', createHealthRoutes());

    // API routes
    app.use('/api/system', createSystemRoutes(systemService, config.jwtSecret));

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'cardvault-system-service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /health - Health check',
          'GET /api/system/info - System information',
          'GET /api/system/version - Version information', 
          'GET /api/system/services - Service health status',
          'GET /api/system/storage - Storage information',
          'GET /api/system/changelog - Changelog',
          'GET /api/system/backup - Backup list',
          'POST /api/system/backup - Create backup',
          'GET /api/system/metrics - System metrics'
        ]
      });
    });

    // Error handling middleware
    app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`System service running on port ${config.port}`, {
        environment: config.nodeEnv,
        corsOrigin: config.corsOrigin,
        services: config.services
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();