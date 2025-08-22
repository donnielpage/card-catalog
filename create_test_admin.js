// Script to create a test Global Admin user for multi-tenant testing
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function createTestAdmin() {
  let client;
  
  try {
    // Connect directly to PostgreSQL as superuser to bypass RLS
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'cardvault_dev',
      user: 'donniepage', // Use superuser to bypass RLS
      password: '', // No password for local superuser
    });

    client = await pool.connect();
    
    const isMultiTenant = process.env.ENABLE_MULTI_TENANT === 'true';
    
    // Password: "admin123"
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    if (isMultiTenant) {
      // Create Global Admin for multi-tenant mode
      const defaultTenantId = '11111111-1111-1111-1111-111111111111'; // Default tenant UUID
      
      // Use the default tenant (it should exist from schema setup)
      // If not, use the first available tenant
      let tenantId = defaultTenantId;
      const availableTenant = await client.query('SELECT id FROM tenants LIMIT 1');
      if (availableTenant.rows.length > 0) {
        tenantId = availableTenant.rows[0].id;
        console.log('Using existing tenant:', tenantId);
      }
      
      // Check if admin already exists
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE username = $1',
        ['global_admin']
      );
      
      if (existingAdmin.rows.length > 0) {
        console.log('Global admin already exists');
        return;
      }
      
      await client.query(`
        INSERT INTO users (
          username, email, firstname, lastname, password_hash, 
          role, tenant_role, tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
      `, [
        'global_admin',
        'globaladmin@cardvault.com', 
        'Global',
        'Admin',
        passwordHash,
        'global_admin',    // Global role
        'user',           // Organization role (not org admin)
        tenantId
      ]);
      
      console.log('✅ Global Admin created successfully!');
      console.log('Username: global_admin');
      console.log('Password: admin123');
      console.log('Email: globaladmin@cardvault.com');
      console.log('');
      console.log('This user can:');
      console.log('- Manage all organizations');
      console.log('- Create new organizations');
      console.log('- Switch between organizations');
      console.log('- Access system management');
      
    } else {
      console.log('Multi-tenant mode is not enabled. Please set ENABLE_MULTI_TENANT=true');
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

createTestAdmin();