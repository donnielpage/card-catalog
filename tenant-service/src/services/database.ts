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
    const createTenantsTable = this.config.type === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
        max_users INTEGER DEFAULT 10,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Trigger to update updated_at on changes
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
      CREATE TRIGGER update_tenants_updated_at
        BEFORE UPDATE ON tenants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ` : `
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
        max_users INTEGER DEFAULT 10,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Trigger to update updated_at on changes
      CREATE TRIGGER IF NOT EXISTS update_tenants_updated_at
        AFTER UPDATE ON tenants
        FOR EACH ROW
        BEGIN
          UPDATE tenants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `;

    await this.execute(createTenantsTable);

    // Create indexes for performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
      CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);
    `;
    await this.execute(createIndexes);
  }

  // Get database type
  getDatabaseType(): string {
    return this.config.type;
  }
}

export default DatabaseService;