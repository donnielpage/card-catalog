import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { DatabaseConfig, TenantContext } from '../types';

// Abstract database interface
export interface DatabaseInterface {
  query(sql: string, params?: any[]): Promise<any>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  close(): Promise<void>;
}

// PostgreSQL implementation with tenant support
class PostgreSQLDatabase implements DatabaseInterface {
  private pool: Pool;
  private tenantContext?: TenantContext;

  constructor(tenantContext?: TenantContext) {
    this.tenantContext = tenantContext;
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'carddb',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
    });

    // Set tenant context for Row Level Security
    if (tenantContext) {
      this.setTenantContext();
    }
  }

  private async setTenantContext() {
    if (this.tenantContext) {
      await this.pool.query('SET app.current_tenant_id = $1', [this.tenantContext.tenantId]);
    }
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const result = await this.pool.query(sql, params);
    return result;
  }

  async get(sql: string, params?: any[]): Promise<any> {
    const result = await this.pool.query(sql, params);
    return result.rows[0];
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// SQLite implementation (single tenant)
class SQLiteDatabase implements DatabaseInterface {
  private db: sqlite3.Database;
  private dbGet: (sql: string, ...params: any[]) => Promise<any>;
  private dbAll: (sql: string, ...params: any[]) => Promise<any[]>;
  private dbRun: (sql: string, ...params: any[]) => Promise<any>;

  constructor() {
    const dbPath = process.env.SQLITE_PATH || './carddb.sqlite';
    this.db = new sqlite3.Database(dbPath);
    
    // Promisify SQLite methods
    this.dbGet = promisify(this.db.get.bind(this.db));
    this.dbAll = promisify(this.db.all.bind(this.db));
    this.dbRun = promisify(this.db.run.bind(this.db));
  }

  async query(sql: string, params?: any[]): Promise<any> {
    return this.dbRun(sql, ...(params || []));
  }

  async get(sql: string, params?: any[]): Promise<any> {
    return this.dbGet(sql, ...(params || []));
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    return this.dbAll(sql, ...(params || []));
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Database factory
export class DatabaseFactory {
  static getInstance(config: DatabaseConfig): DatabaseInterface {
    const usePostgreSQL = process.env.DATABASE_TYPE === 'postgresql';
    
    if (usePostgreSQL) {
      return new PostgreSQLDatabase(config.tenantContext);
    } else {
      return new SQLiteDatabase();
    }
  }
}