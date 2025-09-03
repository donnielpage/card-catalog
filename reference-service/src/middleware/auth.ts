import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser, TenantContext } from '../types';

// Extend Express Request to include user and tenant context
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantContext?: TenantContext;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev';
  
  jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded as AuthUser;
    
    // Set up tenant context if available
    if (req.user?.tenant_id && req.user?.tenant_slug && req.user?.tenant_name) {
      req.tenantContext = {
        tenantId: req.user.tenant_id,
        tenantSlug: req.user.tenant_slug,
        tenantName: req.user.tenant_name
      };
    }
    
    next();
  });
};

// Role-based permissions
export const canRead = (role: string): boolean => {
  // All authenticated users can read reference data
  return true;
};

export const canWrite = (role: string): boolean => {
  const allowedRoles = ['admin', 'manager', 'global_admin', 'global_operator', 'org_admin'];
  return allowedRoles.includes(role);
};

export const requireReadPermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!canRead(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions to read data' });
  }
  
  next();
};

export const requireWritePermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!canWrite(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions to modify data' });
  }
  
  next();
};