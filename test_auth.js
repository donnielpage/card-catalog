// Test the authentication service directly
const { authenticateUser } = require('./src/lib/auth-service.js');

async function testAuth() {
  try {
    console.log('Testing authentication with global_admin...');
    console.log('ENABLE_MULTI_TENANT:', process.env.ENABLE_MULTI_TENANT);
    
    const result = await authenticateUser('global_admin', 'admin123');
    
    if (result.user) {
      console.log('✅ Authentication successful!');
      console.log('User data:', {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        global_role: result.user.global_role,
        organization_role: result.user.organization_role,
        tenant_id: result.user.tenant_id,
        tenant_name: result.user.tenant_name
      });
    } else {
      console.log('❌ Authentication failed');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error during authentication test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAuth();