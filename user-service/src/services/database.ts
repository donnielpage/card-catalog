import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { DatabaseConfig } from '../types';

class DatabaseService {
  private pgPool?: Pool;
  private sqliteDb?: sqlite3.Database;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize() {
    if (this.config.type === 'postgres') {
      this.pgPool = new Pool({
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      this.sqliteDb = new sqlite3.Database(this.config.database);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (this.config.type === 'postgres' && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows;
      } finally {
        client.release();
      }
    } else if (this.sqliteDb) {
      return new Promise((resolve, reject) => {
        this.sqliteDb!.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
    throw new Error('Database not initialized');
  }

  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    if (this.config.type === 'postgres' && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query(sql, params);
      } finally {
        client.release();
      }
    } else if (this.sqliteDb) {
      return new Promise((resolve, reject) => {
        this.sqliteDb!.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.sqliteDb) {
      return new Promise((resolve) => {
        this.sqliteDb!.close(() => resolve());
      });
    }
  }

  // Create tables if they don't exist
  async initializeTables(): Promise<void> {
    const createUsersTable = this.config.type === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        tenant_id VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enable RLS for multi-tenant support
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for tenant isolation
      DROP POLICY IF EXISTS tenant_isolation_users ON users;
      CREATE POLICY tenant_isolation_users ON users
        USING (tenant_id = current_setting('app.current_tenant')::text);
    ` : `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        tenant_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.execute(createUsersTable);

    // Create index for performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
    `;
    await this.execute(createIndexes);
  }

  // Set tenant context for PostgreSQL RLS
  async setTenantContext(tenantId: string): Promise<void> {
    if (this.config.type === 'postgres' && this.pgPool) {
      await this.execute(`SET app.current_tenant = $1`, [tenantId]);
    }
  }
}

export default DatabaseService;