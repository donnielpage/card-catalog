// Disable RLS on tenants table
const { Pool } = require('pg');

async function disableRLS() {
  let client;
  
  try {
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'cardvault_dev',
      user: 'donniepage', // Use superuser
      password: '',
    });

    client = await pool.connect();
    
    console.log('Disabling RLS on tenants table...');
    await client.query('ALTER TABLE tenants DISABLE ROW LEVEL SECURITY');
    
    console.log('✅ RLS disabled on tenants table');
    console.log('Try creating a tenant again');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

disableRLS();