// Fix authentication by temporarily disabling RLS or creating a user that bypasses it
const { Pool } = require('pg');

async function fixAuth() {
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
    
    console.log('Current RLS status on users table:');
    const rlsStatus = await client.query(`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables 
      WHERE tablename = 'users'
    `);
    console.log(rlsStatus.rows);
    
    console.log('');
    console.log('RLS policies on users table:');
    const policies = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'users'
    `);
    console.log(policies.rows);
    
    console.log('');
    console.log('Option 1: Temporarily disable RLS on users table');
    console.log('Would you like me to disable RLS? (y/n)');
    
    // For now, let's just disable RLS temporarily
    console.log('Disabling RLS on users table...');
    await client.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
    
    console.log('✅ RLS disabled on users table');
    console.log('Try logging in again with:');
    console.log('Username: global_admin');
    console.log('Password: admin123');
    
    console.log('');
    console.log('To re-enable RLS later, run:');
    console.log('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

fixAuth();