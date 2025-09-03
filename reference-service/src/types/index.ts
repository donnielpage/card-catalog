// Reference Data Types
export interface Player {
  id?: string | number;
  firstname: string;
  lastname: string;
  dob?: string;
  tenant_id?: string;
}

export interface Team {
  id?: string | number;
  city: string;
  mascot?: string;
  teamname: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  tenant_id?: string;
}

export interface Manufacturer {
  id?: string | number;
  company: string;
  year?: number;
  subsetname?: string;
  tenant_id?: string;
}

// Authentication Types
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  tenant_id?: string;
  tenant_slug?: string;
  tenant_name?: string;
}

// Tenant Context
export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Database Configuration
export interface DatabaseConfig {
  enableMultiTenant: boolean;
  tenantContext?: TenantContext;
}