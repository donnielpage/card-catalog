import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
  expires_in: number;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  tenantId: string;
  iat: number;
  exp: number;
}

export interface DatabaseConfig {
  type: 'postgres' | 'sqlite';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
}

export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  corsOrigin: string;
  database: DatabaseConfig;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}