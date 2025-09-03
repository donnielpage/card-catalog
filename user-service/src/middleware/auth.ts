import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload, AuthenticatedRequest } from '../types';

export interface AuthMiddlewareOptions {
  jwtSecret: string;
  requiredRole?: 'admin' | 'user';
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7)
        : authHeader;

      if (!token) {
        return res.status(401).json({ error: 'Token required' });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, options.jwtSecret) as AuthTokenPayload;
      
      // Check if token is from the correct service
      if (!decoded.userId || !decoded.tenantId) {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      // Check role if required
      if (options.requiredRole && decoded.role !== options.requiredRole && decoded.role !== 'admin') {
        return res.status(403).json({ error: `Role '${options.requiredRole}' required` });
      }

      // Add user info to request
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

// Middleware to extract tenant ID from token for database operations
export function extractTenantMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.tenantId) {
    // Add tenant context to request for database operations
    (req as any).tenantId = req.user.tenantId;
  }
  next();
}

// Rate limiting middleware for auth endpoints
export function createRateLimitMiddleware() {
  const requests: Map<string, { count: number; resetTime: number }> = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_REQUESTS = 10; // Max 10 login attempts per IP per 15 minutes

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientIP);
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientIP, { count: 1, resetTime: now + WINDOW_MS });
      next();
    } else if (clientData.count >= MAX_REQUESTS) {
      res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    } else {
      clientData.count++;
      next();
    }
  };
}