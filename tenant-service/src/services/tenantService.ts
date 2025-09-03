import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import axios from 'axios';
import DatabaseService from './database';
import { 
  Tenant, 
  CreateTenantRequest, 
  UpdateTenantRequest, 
  TenantStats, 
  TenantUsage,
  ServiceConfig
} from '../types';

export class TenantService {
  private db: DatabaseService;
  private config: ServiceConfig;

  constructor(db: DatabaseService, config: ServiceConfig) {
    this.db = db;
    this.config = config;
  }

  async createTenant(tenantData: CreateTenantRequest): Promise<Tenant> {
    const { name, slug, subscription_tier = 'free', max_users = 10, admin_email, admin_name } = tenantData;

    // Generate slug if not provided
    const tenantSlug = slug || slugify(name, { lower: true, strict: true });

    // Check if slug already exists
    const existingTenant = await this.db.queryOne(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (existingTenant) {
      throw new Error(`Tenant with slug '${tenantSlug}' already exists`);
    }

    // Generate tenant ID
    const tenantId = uuidv4();

    // Insert tenant
    const insertQuery = this.db.getDatabaseType() === 'postgres' 
      ? `INSERT INTO tenants (id, name, slug, subscription_tier, max_users, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      : `INSERT INTO tenants (id, name, slug, subscription_tier, max_users, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;

    await this.db.execute(insertQuery, [tenantId, name, tenantSlug, subscription_tier, max_users]);

    // If admin user details provided, create admin user via User Service
    if (admin_email && admin_name) {
      try {
        await this.createTenantAdmin(tenantId, admin_email, admin_name);
      } catch (error) {
        console.warn(`Failed to create admin user for tenant ${tenantId}:`, error);
        // Don't fail tenant creation if admin user creation fails
      }
    }

    // Return created tenant
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Failed to create tenant');
    }

    return tenant;
  }

  private async createTenantAdmin(tenantId: string, email: string, name: string): Promise<void> {
    try {
      // Call User Service to create admin user
      const response = await axios.post(`${this.config.userServiceUrl}/api/auth/register`, {
        email,
        name,
        password: this.generateTempPassword(),
        role: 'admin'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId
        }
      });

      if (response.status !== 201) {
        throw new Error(`Failed to create admin user: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`User service error: ${error}`);
    }
  }

  private generateTempPassword(): string {
    // Generate secure temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async getTenantById(tenantId: string): Promise<Tenant | null> {
    const tenantRow = await this.db.queryOne(
      'SELECT id, name, slug, subscription_tier, max_users, status, created_at, updated_at FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (!tenantRow) {
      return null;
    }

    return this.mapRowToTenant(tenantRow);
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const tenantRow = await this.db.queryOne(
      'SELECT id, name, slug, subscription_tier, max_users, status, created_at, updated_at FROM tenants WHERE slug = ?',
      [slug]
    );

    if (!tenantRow) {
      return null;
    }

    return this.mapRowToTenant(tenantRow);
  }

  async getAllTenants(limit = 50, offset = 0): Promise<Tenant[]> {
    const query = this.db.getDatabaseType() === 'postgres' ? `
      SELECT 
        t.id, t.name, t.slug, t.subscription_tier, t.max_users, 
        t.status, t.created_at, t.updated_at,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      GROUP BY t.id, t.name, t.slug, t.subscription_tier, t.max_users, t.status, t.created_at, t.updated_at
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    ` : `
      SELECT 
        t.id, t.name, t.slug, t.subscription_tier, t.max_users, 
        t.status, t.created_at, t.updated_at,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const tenantRows = await this.db.query(query, [limit, offset]);

    return tenantRows.map(row => ({
      ...this.mapRowToTenant(row),
      user_count: parseInt(row.user_count) || 0,
      admin_count: parseInt(row.admin_count) || 0
    }));
  }

  async updateTenant(tenantId: string, updateData: UpdateTenantRequest): Promise<Tenant> {
    const { name, slug, subscription_tier, max_users, status } = updateData;
    
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (name !== undefined) {
      fields.push(`name = ${this.db.getDatabaseType() === 'postgres' ? '$' + paramCounter++ : '?'}`);
      values.push(name);
    }
    if (slug !== undefined) {
      // Check if new slug conflicts with existing tenant
      const existingTenant = await this.db.queryOne(
        'SELECT id FROM tenants WHERE slug = ? AND id != ?',
        [slug, tenantId]
      );
      if (existingTenant) {
        throw new Error(`Tenant with slug '${slug}' already exists`);
      }
      fields.push(`slug = ${this.db.getDatabaseType() === 'postgres' ? '$' + paramCounter++ : '?'}`);
      values.push(slug);
    }
    if (subscription_tier !== undefined) {
      fields.push(`subscription_tier = ${this.db.getDatabaseType() === 'postgres' ? '$' + paramCounter++ : '?'}`);
      values.push(subscription_tier);
    }
    if (max_users !== undefined) {
      fields.push(`max_users = ${this.db.getDatabaseType() === 'postgres' ? '$' + paramCounter++ : '?'}`);
      values.push(max_users);
    }
    if (status !== undefined) {
      fields.push(`status = ${this.db.getDatabaseType() === 'postgres' ? '$' + paramCounter++ : '?'}`);
      values.push(status);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const updateTimeField = this.db.getDatabaseType() === 'postgres' 
      ? 'updated_at = CURRENT_TIMESTAMP'
      : 'updated_at = datetime("now")';
    
    fields.push(updateTimeField);
    values.push(tenantId);

    const updateQuery = `UPDATE tenants SET ${fields.join(', ')} WHERE id = ${this.db.getDatabaseType() === 'postgres' ? '$' + paramCounter : '?'}`;

    await this.db.execute(updateQuery, values);

    const updatedTenant = await this.getTenantById(tenantId);
    if (!updatedTenant) {
      throw new Error('Tenant not found');
    }

    return updatedTenant;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // TODO: In production, this should handle cascading deletes
    // and cleanup of tenant data across all services
    await this.db.execute('DELETE FROM tenants WHERE id = ?', [tenantId]);
  }

  async getTenantStats(): Promise<TenantStats> {
    const statsQuery = this.db.getDatabaseType() === 'postgres' ? `
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_tenants,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tenants
      FROM tenants
    ` : `
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_tenants,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tenants
      FROM tenants
    `;

    const userStatsQuery = `
      SELECT COUNT(*) as total_users
      FROM users
    `;

    const [tenantStats, userStats] = await Promise.all([
      this.db.queryOne(statsQuery),
      this.db.queryOne(userStatsQuery)
    ]);

    const totalTenants = parseInt(tenantStats.total_tenants) || 0;
    const totalUsers = parseInt(userStats.total_users) || 0;

    return {
      total_tenants: totalTenants,
      active_tenants: parseInt(tenantStats.active_tenants) || 0,
      suspended_tenants: parseInt(tenantStats.suspended_tenants) || 0,
      pending_tenants: parseInt(tenantStats.pending_tenants) || 0,
      total_users: totalUsers,
      average_users_per_tenant: totalTenants > 0 ? Math.round((totalUsers / totalTenants) * 100) / 100 : 0
    };
  }

  async getTenantUsage(): Promise<TenantUsage[]> {
    const query = this.db.getDatabaseType() === 'postgres' ? `
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        COUNT(u.id) as user_count,
        t.max_users,
        ROUND((COUNT(u.id)::float / t.max_users * 100), 2) as usage_percentage
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      WHERE t.status = 'active'
      GROUP BY t.id, t.name, t.max_users
      ORDER BY usage_percentage DESC
    ` : `
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        COUNT(u.id) as user_count,
        t.max_users,
        ROUND((CAST(COUNT(u.id) AS REAL) / t.max_users * 100), 2) as usage_percentage
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      WHERE t.status = 'active'
      GROUP BY t.id, t.name, t.max_users
      ORDER BY usage_percentage DESC
    `;

    const usageRows = await this.db.query(query);

    return usageRows.map(row => ({
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      user_count: parseInt(row.user_count) || 0,
      max_users: parseInt(row.max_users) || 0,
      usage_percentage: parseFloat(row.usage_percentage) || 0
    }));
  }

  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      subscription_tier: row.subscription_tier,
      max_users: parseInt(row.max_users) || 0,
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}