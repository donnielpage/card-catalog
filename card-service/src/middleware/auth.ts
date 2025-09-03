import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload, AuthenticatedRequest } from '../types';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = roles.includes(req.user.role) || 
                   (req.user.globalRole && roles.includes(req.user.globalRole));

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const extractTenantContext = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const tenantName = req.headers['x-tenant-name'] as string;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }

  req.tenantContext = {
    tenantId,
    tenantSlug: tenantSlug || '',
    tenantName: tenantName || ''
  };

  next();
};