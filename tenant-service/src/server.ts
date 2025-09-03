import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import DatabaseService from './services/database';
import { TenantService } from './services/tenantService';
import { createTenantRoutes } from './routes/tenants';
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
  port: parseInt(process.env.PORT || '3005'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  database: {
    type: (process.env.DB_TYPE as 'postgres' | 'sqlite') || 'sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'tenant-service.sqlite',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3003'
};

async function startServer() {
  try {
    // Initialize database
    const db = new DatabaseService(config.database);
    await db.initializeTables();
    logger.info('Database initialized successfully');

    // Initialize tenant service
    const tenantService = new TenantService(db, config);

    // Create Express app
    const app = express();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: false // Allow for API usage
    }));

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
    app.use('/health', createHealthRoutes(db));

    // API routes
    app.use('/api/tenants', createTenantRoutes(tenantService, config.jwtSecret));

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'cardvault-tenant-service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /health - Health check',
          'GET /api/tenants - List all tenants',
          'GET /api/tenants/stats - Tenant statistics',
          'GET /api/tenants/usage - Tenant usage information',
          'GET /api/tenants/:id - Get specific tenant',
          'GET /api/tenants/slug/:slug - Get tenant by slug',
          'POST /api/tenants - Create new tenant',
          'PUT /api/tenants/:id - Update tenant',
          'DELETE /api/tenants/:id - Delete tenant',
          'POST /api/tenants/:id/suspend - Suspend tenant',
          'POST /api/tenants/:id/activate - Activate tenant'
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
      logger.info(`Tenant service running on port ${config.port}`, {
        environment: config.nodeEnv,
        database: config.database.type,
        corsOrigin: config.corsOrigin,
        userServiceUrl: config.userServiceUrl
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await db.close();
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