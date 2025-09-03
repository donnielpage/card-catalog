import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { DatabaseConfig, TenantContext } from '../types';

class DatabaseService {
  private pgPool?: Pool;
  private sqliteDb?: sqlite3.Database;
  private config: DatabaseConfig;
  private tenantContext?: TenantContext;

  constructor(config: DatabaseConfig, tenantContext?: TenantContext) {
    this.config = config;
    this.tenantContext = tenantContext;
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
        // Set tenant context for RLS if available
        if (this.tenantContext) {
          await client.query('SET app.current_tenant = $1', [this.tenantContext.tenantId]);
        }
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
        // Set tenant context for RLS if available
        if (this.tenantContext) {
          await client.query('SET app.current_tenant = $1', [this.tenantContext.tenantId]);
        }
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
    const createCardsTable = this.config.type === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cardnumber VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        description TEXT,
        grade VARCHAR(20),
        playerid UUID,
        teamid UUID,
        manufacturerid UUID,
        tenant_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cardnumber, year, tenant_id)
      );

      -- Enable RLS for multi-tenant support
      ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for tenant isolation
      DROP POLICY IF EXISTS tenant_isolation_cards ON cards;
      CREATE POLICY tenant_isolation_cards ON cards
        USING (tenant_id = current_setting('app.current_tenant')::text);
    ` : `
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        cardnumber TEXT NOT NULL,
        year INTEGER NOT NULL,
        description TEXT,
        grade TEXT,
        playerid TEXT,
        teamid TEXT,
        manufacturerid TEXT,
        tenant_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cardnumber, year, tenant_id)
      );
    `;

    await this.execute(createCardsTable);

    // Create indexes for performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_cards_tenant_id ON cards(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_cards_year ON cards(year);
      CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
    `;
    await this.execute(createIndexes);
  }

  // Get database type
  getDatabaseType(): string {
    return this.config.type;
  }

  // Set tenant context
  setTenantContext(tenantContext: TenantContext) {
    this.tenantContext = tenantContext;
  }
}

export default DatabaseService;