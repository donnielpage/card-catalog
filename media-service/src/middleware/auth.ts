import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
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
    next();
  });
};

export const canCreate = (role: string): boolean => {
  const allowedRoles = ['admin', 'manager', 'global_admin', 'global_operator', 'org_admin'];
  return allowedRoles.includes(role);
};

export const requireCreatePermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!canCreate(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  next();
};