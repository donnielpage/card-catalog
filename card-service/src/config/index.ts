import { ServiceConfig } from '../types';

const config: ServiceConfig = {
  port: parseInt(process.env.PORT || '3006'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  database: {
    type: (process.env.DATABASE_TYPE as 'postgres' | 'sqlite') || 'sqlite',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || './data/cardvault.db',
    username: process.env.DATABASE_USER || 'cardvault',
    password: process.env.DATABASE_PASSWORD || 'password'
  },
  services: {
    referenceService: process.env.REFERENCE_SERVICE_URL || 'http://localhost:3001',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3003',
    tenantService: process.env.TENANT_SERVICE_URL || 'http://localhost:3005',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3002'
  }
};

export default config;