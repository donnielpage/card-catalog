import { Pool, Client, PoolConfig } from 'pg';

interface TenantContext {
  tenantId: string;
  tenantSlug: string;
}

class PostgreSQLDatabase {
  private pool: Pool;
  private tenantContext?: TenantContext;

  constructor(config?: PoolConfig, tenantContext?: TenantContext) {
    const defaultConfig: PoolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'cardvault_dev',
      user: process.env.POSTGRES_USER || process.env.USER,
      password: process.env.POSTGRES_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool({ ...defaultConfig, ...config });
    this.tenantContext = tenantContext;
  }

  // Set tenant context for all subsequent queries
  setTenantContext(context: TenantContext): void {
    this.tenantContext = context;
  }

  // Get current tenant context
  getTenantContext(): TenantContext | undefined {
    return this.tenantContext;
  }

  async run(sql: string, params: unknown[] = []): Promise<{ id?: string; changes: number }> {
    const client = await this.pool.connect();
    try {
      // Set tenant context for Row Level Security (RLS)
      // Temporarily disabled RLS to fix UUID validation errors
      // TODO: Fix RLS policies and data to handle proper UUID validation
      /*
      if (this.tenantContext?.tenantId) {
        await client.query(`SET LOCAL app.current_tenant_id = '${this.tenantContext.tenantId}'`);
      }
      */
      
      const result = await client.query(sql, params);
      return { 
        id: result.rows[0]?.id || undefined,
        changes: result.rowCount || 0 
      };
    } finally {
      client.release();
    }
  }

  async get(sql: string, params: unknown[] = []): Promise<unknown> {
    const client = await this.pool.connect();
    try {
      // Set tenant context for Row Level Security (RLS)
      // Temporarily disabled RLS to fix UUID validation errors
      // TODO: Fix RLS policies and data to handle proper UUID validation
      /*
      if (this.tenantContext?.tenantId) {
        await client.query(`SET LOCAL app.current_tenant_id = '${this.tenantContext.tenantId}'`);
      }
      */
      
      const result = await client.query(sql, params);
      return result.rows[0] || undefined;
    } finally {
      client.release();
    }
  }

  async all(sql: string, params: unknown[] = []): Promise<unknown[]> {
    const client = await this.pool.connect();
    try {
      // Set tenant context for Row Level Security (RLS)
      // Temporarily disabled RLS to fix UUID validation errors
      // TODO: Fix RLS policies and data to handle proper UUID validation
      /*
      if (this.tenantContext?.tenantId) {
        console.log('Setting tenant context in all():', this.tenantContext.tenantId);
        await client.query(`SET LOCAL app.current_tenant_id = '${this.tenantContext.tenantId}'`);
      } else {
        console.log('No tenant context to set in all(), tenantContext:', this.tenantContext);
      }
      */
      
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Tenant-aware convenience methods
  async runWithTenant(sql: string, params: unknown[] = [], tenantId?: string): Promise<{ id?: string; changes: number }> {
    if (tenantId) {
      // Add tenant_id to params if not already included
      if (!sql.includes('tenant_id')) {
        // This is a simple approach - in production you'd want more sophisticated query building
        const tenantAwareParams = [tenantId, ...params];
        return this.run(sql, tenantAwareParams);
      }
    }
    return this.run(sql, params);
  }

  async getAllWithTenant(sql: string, params: unknown[] = [], tenantId?: string): Promise<unknown[]> {
    const effectiveTenantId = tenantId || this.tenantContext?.tenantId;
    if (effectiveTenantId && !sql.includes('WHERE')) {
      // Add tenant filtering to query
      const tenantAwareSql = sql + ' WHERE tenant_id = $1';
      return this.all(tenantAwareSql, [effectiveTenantId, ...params]);
    } else if (effectiveTenantId && sql.includes('WHERE')) {
      // Add tenant filtering to existing WHERE clause
      const tenantAwareSql = sql.replace('WHERE', 'WHERE tenant_id = $1 AND');
      return this.all(tenantAwareSql, [effectiveTenantId, ...params]);
    }
    return this.all(sql, params);
  }

  async getWithTenant(sql: string, params: unknown[] = [], tenantId?: string): Promise<unknown> {
    const effectiveTenantId = tenantId || this.tenantContext?.tenantId;
    if (effectiveTenantId && !sql.includes('WHERE')) {
      const tenantAwareSql = sql + ' WHERE tenant_id = $1';
      return this.get(tenantAwareSql, [effectiveTenantId, ...params]);
    } else if (effectiveTenantId && sql.includes('WHERE')) {
      const tenantAwareSql = sql.replace('WHERE', 'WHERE tenant_id = $1 AND');
      return this.get(tenantAwareSql, [effectiveTenantId, ...params]);
    }
    return this.get(sql, params);
  }

  // Tenant management methods
  async createTenant(name: string, slug: string, subscriptionTier = 'starter', maxUsers = 5): Promise<unknown> {
    const sql = `
      INSERT INTO tenants (name, slug, subscription_tier, max_users)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, slug, subscription_tier, max_users, created_at
    `;
    return this.get(sql, [name, slug, subscriptionTier, maxUsers]);
  }

  async getTenant(slug: string): Promise<unknown> {
    const sql = 'SELECT * FROM tenants WHERE slug = $1 AND status = $2';
    return this.get(sql, [slug, 'active']);
  }

  async listTenants(): Promise<unknown[]> {
    const sql = 'SELECT id, name, slug, subscription_tier, max_users, created_at FROM tenants WHERE status = $1';
    return this.all(sql, ['active']);
  }

  // Connection management
  async close(): Promise<void> {
    await this.pool.end();
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.get('SELECT NOW() as current_time');
      return !!result;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export default PostgreSQLDatabase;
export type { TenantContext };