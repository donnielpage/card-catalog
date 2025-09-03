import { Request } from 'express';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  max_users: number;
  status: 'active' | 'suspended' | 'pending';
  created_at: Date;
  updated_at: Date;
  user_count?: number;
  admin_count?: number;
}

export interface CreateTenantRequest {
  name: string;
  slug?: string;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
  max_users?: number;
  admin_email?: string;
  admin_name?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
  max_users?: number;
  status?: 'active' | 'suspended' | 'pending';
}

export interface TenantStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  pending_tenants: number;
  total_users: number;
  average_users_per_tenant: number;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  tenantId: string;
  globalRole?: 'global_admin' | 'tenant_admin' | 'user';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
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
  userServiceUrl: string;
}

export interface TenantUsage {
  tenant_id: string;
  tenant_name: string;
  user_count: number;
  max_users: number;
  usage_percentage: number;
  card_count?: number;
  storage_used?: number;
}