// Script to check if the global admin user exists and verify password
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function checkUser() {
  let client;
  
  try {
    // Connect directly to PostgreSQL
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'cardvault_dev',
      user: 'donniepage', // Use superuser
      password: '', // No password for local superuser
    });

    client = await pool.connect();
    
    // Check if both users exist
    console.log('Checking for admin user...');
    const adminUser = await client.query(
      'SELECT id, username, email, role, tenant_role, tenant_id, password_hash FROM users WHERE username = $1',
      ['admin']
    );
    
    if (adminUser.rows.length > 0) {
      const userData = adminUser.rows[0];
      console.log('✅ Admin user found:');
      console.log('Username:', userData.username);
      console.log('Role:', userData.role);
      console.log('Tenant Role:', userData.tenant_role);
      
      // Test password123
      const isValid = await bcrypt.compare('password123', userData.password_hash);
      console.log('Password "password123":', isValid ? '✅ Valid' : '❌ Invalid');
    } else {
      console.log('❌ Admin user not found');
    }
    
    console.log('');
    console.log('Checking for global_admin user...');
    const user = await client.query(
      'SELECT id, username, email, role, tenant_role, tenant_id, password_hash FROM users WHERE username = $1',
      ['global_admin']
    );
    
    if (user.rows.length === 0) {
      console.log('❌ User global_admin not found');
      return;
    }
    
    const userData = user.rows[0];
    console.log('✅ User found:');
    console.log('ID:', userData.id);
    console.log('Username:', userData.username);
    console.log('Email:', userData.email);
    console.log('Role:', userData.role);
    console.log('Tenant Role:', userData.tenant_role);
    console.log('Tenant ID:', userData.tenant_id);
    console.log('Password Hash:', userData.password_hash ? 'Present' : 'Missing');
    
    // Test password verification
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, userData.password_hash);
    console.log('');
    console.log('Password Test:');
    console.log('Testing password "admin123":', isValid ? '✅ Valid' : '❌ Invalid');
    
    // Also check for any other admin users
    console.log('');
    console.log('All admin users in database:');
    const allAdmins = await client.query(
      "SELECT username, email, role, tenant_role FROM users WHERE role LIKE '%admin%' OR username LIKE '%admin%'"
    );
    
    allAdmins.rows.forEach(admin => {
      console.log(`- ${admin.username} (${admin.email}) - Global: ${admin.role}, Org: ${admin.tenant_role}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking user:', error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

checkUser();