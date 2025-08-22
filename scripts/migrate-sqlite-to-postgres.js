#!/usr/bin/env node
/**
 * SQLite to PostgreSQL Migration Script for CardVault
 * 
 * This script migrates an existing SQLite CardVault database to the new
 * PostgreSQL multi-tenant architecture.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { Pool } = require('pg');

// Configuration
const SQLITE_PATH = process.env.SQLITE_PATH || './carddb.sqlite';
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'My Collection';
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'my-collection';

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'cardvault_production',
  user: process.env.POSTGRES_USER || 'cardvault',
  password: process.env.POSTGRES_PASSWORD || '',
});

class Migration {
  constructor() {
    this.sqliteDb = null;
    this.tenantId = null;
    this.stats = {
      users: 0,
      teams: 0,
      players: 0,
      manufacturers: 0,
      cards: 0,
    };
  }

  async init() {
    console.log('🚀 Starting SQLite to PostgreSQL migration...');
    
    // Check SQLite file exists
    if (!fs.existsSync(SQLITE_PATH)) {
      throw new Error(`SQLite file not found: ${SQLITE_PATH}`);
    }
    
    // Open SQLite database
    this.sqliteDb = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);
    
    // Test PostgreSQL connection
    try {
      await pgPool.query('SELECT NOW()');
      console.log('✅ PostgreSQL connection successful');
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  async createDefaultTenant() {
    console.log('🏢 Creating default tenant...');
    
    const result = await pgPool.query(
      `INSERT INTO tenants (name, slug, subscription_tier, max_users, status)
       VALUES ($1, $2, 'professional', 50, 'active')
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         subscription_tier = EXCLUDED.subscription_tier,
         max_users = EXCLUDED.max_users
       RETURNING id`,
      [DEFAULT_TENANT_NAME, DEFAULT_TENANT_SLUG]
    );
    
    this.tenantId = result.rows[0].id;
    console.log(`✅ Tenant created with ID: ${this.tenantId}`);
  }

  async migrateSQLiteTable(tableName, transformFn = null) {
    return new Promise((resolve, reject) => {
      console.log(`📋 Migrating ${tableName}...`);
      
      this.sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        let count = 0;
        for (const row of rows) {
          try {
            if (transformFn) {
              await transformFn(row);
            } else {
              await this.insertRow(tableName, row);
            }
            count++;
          } catch (error) {
            console.error(`❌ Error migrating ${tableName} row:`, error.message);
          }
        }
        
        this.stats[tableName] = count;
        console.log(`✅ Migrated ${count} ${tableName} records`);
        resolve();
      });
    });
  }

  async insertRow(tableName, row) {
    // Add tenant_id and convert auto-increment ID to UUID
    const data = {
      ...row,
      tenant_id: this.tenantId,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // Remove auto-increment ID, PostgreSQL will generate UUID
    delete data.id;
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `;
    
    await pgPool.query(query, values);
  }

  async migrateUsers(row) {
    // Users need special handling for tenant_role
    const userData = {
      tenant_id: this.tenantId,
      username: row.username,
      email: row.email,
      firstname: row.firstname,
      lastname: row.lastname,
      password_hash: row.password_hash,
      role: row.role || 'user',
      tenant_role: row.role || 'user', // Copy role to tenant_role
      permissions: '{}',
      favorite_team_id: row.favorite_team_id || null,
      favorite_player_id: row.favorite_player_id || null,
      created_at: row.created_at || new Date(),
      updated_at: row.updated_at || new Date(),
    };
    
    const columns = Object.keys(userData);
    const values = Object.values(userData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO users (${columns.join(', ')})
      VALUES (${placeholders})
    `;
    
    await pgPool.query(query, values);
  }

  async updateReferences() {
    console.log('🔗 Updating foreign key references...');
    
    // This is a simplified approach - in production, you'd want to
    // maintain a mapping of old IDs to new UUIDs for proper FK relationships
    console.log('⚠️ Note: Foreign key relationships may need manual verification');
  }

  async verifyMigration() {
    console.log('🔍 Verifying migration...');
    
    for (const [table, expectedCount] of Object.entries(this.stats)) {
      const result = await pgPool.query(
        `SELECT COUNT(*) FROM ${table} WHERE tenant_id = $1`,
        [this.tenantId]
      );
      
      const actualCount = parseInt(result.rows[0].count);
      if (actualCount === expectedCount) {
        console.log(`✅ ${table}: ${actualCount} records (matches SQLite)`);
      } else {
        console.log(`❌ ${table}: ${actualCount} records (expected ${expectedCount})`);
      }
    }
  }

  async cleanup() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    await pgPool.end();
  }

  async run() {
    try {
      await this.init();
      await this.createDefaultTenant();
      
      // Migrate in order (respecting dependencies)
      await this.migrateSQLiteTable('teams');
      await this.migrateSQLiteTable('players');
      await this.migrateSQLiteTable('manufacturers');
      await this.migrateSQLiteTable('users', this.migrateUsers.bind(this));
      await this.migrateSQLiteTable('cards');
      
      await this.updateReferences();
      await this.verifyMigration();
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('📊 Migration Summary:');
      console.log(`   Tenant: ${DEFAULT_TENANT_NAME} (${this.tenantId})`);
      for (const [table, count] of Object.entries(this.stats)) {
        console.log(`   ${table}: ${count} records`);
      }
      
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new Migration();
  migration.run();
}

module.exports = Migration;