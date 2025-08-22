/**
 * Unified Database Interface for CardVault
 * 
 * This interface provides a consistent API for database operations
 * regardless of whether we're using SQLite or PostgreSQL.
 */

export interface QueryResult {
  id?: string | number;
  changes?: number;
  rowCount?: number;
}

export interface DatabaseInterface {
  // Basic CRUD operations
  run(sql: string, params?: unknown[]): Promise<QueryResult>;
  get(sql: string, params?: unknown[]): Promise<unknown>;
  all(sql: string, params?: unknown[]): Promise<unknown[]>;
  
  // Connection management
  close(): Promise<void> | void;
  testConnection?(): Promise<boolean>;
  
  // Tenant-aware operations (only for PostgreSQL)
  setTenantContext?(context: { tenantId: string; tenantSlug: string }): void;
  getTenantContext?(): { tenantId: string; tenantSlug: string } | undefined;
}

export interface TenantDatabaseInterface extends DatabaseInterface {
  // Tenant management
  createTenant(name: string, slug: string, subscriptionTier?: string, maxUsers?: number): Promise<unknown>;
  getTenant(slug: string): Promise<unknown>;
  listTenants(): Promise<unknown[]>;
  
  // Tenant-aware CRUD
  runWithTenant(sql: string, params?: unknown[], tenantId?: string): Promise<QueryResult>;
  getWithTenant(sql: string, params?: unknown[], tenantId?: string): Promise<unknown>;
  getAllWithTenant(sql: string, params?: unknown[], tenantId?: string): Promise<unknown[]>;
}

/**
 * Database Adapter - Wraps existing database classes to implement interface
 */
import Database from './database';
import PostgreSQLDatabase from './database-pg';

export class SQLiteDatabaseAdapter implements DatabaseInterface {
  constructor(private db: Database) {}

  async run(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const result = await this.db.run(sql, params);
    return {
      id: result.id,
      changes: result.changes,
      rowCount: result.changes,
    };
  }

  async get(sql: string, params: unknown[] = []): Promise<unknown> {
    return await this.db.get(sql, params);
  }

  async all(sql: string, params: unknown[] = []): Promise<unknown[]> {
    return await this.db.all(sql, params);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.get('SELECT 1 as test');
      return !!result;
    } catch (error) {
      return false;
    }
  }
}

export class PostgreSQLDatabaseAdapter implements TenantDatabaseInterface {
  constructor(private db: PostgreSQLDatabase) {}

  async run(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const result = await this.db.run(sql, params);
    return {
      id: result.id,
      changes: result.changes,
      rowCount: result.changes,
    };
  }

  async get(sql: string, params: unknown[] = []): Promise<unknown> {
    return await this.db.get(sql, params);
  }

  async all(sql: string, params: unknown[] = []): Promise<unknown[]> {
    return await this.db.all(sql, params);
  }

  async close(): Promise<void> {
    return await this.db.close();
  }

  async testConnection(): Promise<boolean> {
    return await this.db.testConnection();
  }

  setTenantContext(context: { tenantId: string; tenantSlug: string }): void {
    this.db.setTenantContext(context);
  }

  getTenantContext(): { tenantId: string; tenantSlug: string } | undefined {
    return this.db.getTenantContext();
  }

  // Tenant management methods
  async createTenant(name: string, slug: string, subscriptionTier = 'starter', maxUsers = 5): Promise<unknown> {
    return await this.db.createTenant(name, slug, subscriptionTier, maxUsers);
  }

  async getTenant(slug: string): Promise<unknown> {
    return await this.db.getTenant(slug);
  }

  async listTenants(): Promise<unknown[]> {
    return await this.db.listTenants();
  }

  // Tenant-aware CRUD operations
  async runWithTenant(sql: string, params: unknown[] = [], tenantId?: string): Promise<QueryResult> {
    const result = await this.db.runWithTenant(sql, params, tenantId);
    return {
      id: result.id,
      changes: result.changes,
      rowCount: result.changes,
    };
  }

  async getWithTenant(sql: string, params: unknown[] = [], tenantId?: string): Promise<unknown> {
    return await this.db.getWithTenant(sql, params, tenantId);
  }

  async getAllWithTenant(sql: string, params: unknown[] = [], tenantId?: string): Promise<unknown[]> {
    return await this.db.getAllWithTenant(sql, params, tenantId);
  }
}

/**
 * Helper functions for type checking and casting
 */
export function isTenantDatabase(db: DatabaseInterface): db is TenantDatabaseInterface {
  return 'createTenant' in db && 'setTenantContext' in db;
}

export function requireTenantDatabase(db: DatabaseInterface): TenantDatabaseInterface {
  if (!isTenantDatabase(db)) {
    throw new Error('Tenant operations require PostgreSQL multi-tenant database');
  }
  return db;
}

/**
 * Query builders for cross-database compatibility
 */
export class QueryBuilder {
  static insertQuery(
    table: string, 
    data: Record<string, unknown>, 
    isMultiTenant: boolean = false
  ): { sql: string; params: unknown[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    if (isMultiTenant) {
      // PostgreSQL style with RETURNING
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      return {
        sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        params: values
      };
    } else {
      // SQLite style
      const placeholders = values.map(() => '?').join(', ');
      return {
        sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        params: values
      };
    }
  }

  static updateQuery(
    table: string,
    data: Record<string, unknown>,
    whereClause: string,
    whereParams: unknown[],
    isMultiTenant: boolean = false
  ): { sql: string; params: unknown[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    if (isMultiTenant) {
      // PostgreSQL style
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      const whereParamsStart = values.length + 1;
      const adjustedWhereClause = whereClause.replace(/\?/g, (_, index) => 
        `$${whereParamsStart + index}`
      );
      
      return {
        sql: `UPDATE ${table} SET ${setClause} WHERE ${adjustedWhereClause} RETURNING *`,
        params: [...values, ...whereParams]
      };
    } else {
      // SQLite style
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      return {
        sql: `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`,
        params: [...values, ...whereParams]
      };
    }
  }

  static selectQuery(
    table: string,
    columns: string[] = ['*'],
    whereClause?: string,
    orderBy?: string,
    limit?: number
  ): string {
    let sql = `SELECT ${columns.join(', ')} FROM ${table}`;
    
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    return sql;
  }
}