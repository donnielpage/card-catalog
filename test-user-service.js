#!/usr/bin/env node

const https = require('https');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const USER_SERVICE_DIRECT = process.env.USER_SERVICE_DIRECT || 'http://localhost:3003';

// Test data
const testUser = {
  email: 'test@cardvault.com',
  password: 'TestPassword123',
  name: 'Test User'
};

const testAdmin = {
  email: 'admin@cardvault.com',
  password: 'AdminPassword123',
  name: 'Admin User',
  role: 'admin'
};

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = require(url.startsWith('https') ? 'https' : 'http').request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'test-tenant',
        ...options.headers
      },
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Checks...');
  
  try {
    // Direct service health
    const directHealth = await makeRequest(`${USER_SERVICE_DIRECT}/health`);
    console.log(`✅ Direct health: ${directHealth.status} - ${directHealth.data.status}`);
    
    // Through API Gateway
    const gatewayHealth = await makeRequest(`${API_BASE}/health/user-service`);
    console.log(`✅ Gateway health: ${gatewayHealth.status} - ${gatewayHealth.data.status}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n👤 Testing User Registration...');
  
  try {
    // Register regular user
    const userReg = await makeRequest(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      body: testUser
    });
    
    if (userReg.status === 201) {
      console.log(`✅ User registration: ${userReg.status} - ${userReg.data.message}`);
    } else {
      console.log(`⚠️ User registration: ${userReg.status} - ${JSON.stringify(userReg.data)}`);
    }
    
    // Register admin user
    const adminReg = await makeRequest(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      body: testAdmin
    });
    
    if (adminReg.status === 201) {
      console.log(`✅ Admin registration: ${adminReg.status} - ${adminReg.data.message}`);
    } else {
      console.log(`⚠️ Admin registration: ${adminReg.status} - ${JSON.stringify(adminReg.data)}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Registration failed: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  try {
    // Login user
    const userLogin = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: {
        email: testUser.email,
        password: testUser.password
      }
    });
    
    if (userLogin.status === 200) {
      console.log(`✅ User login: ${userLogin.status} - Welcome ${userLogin.data.user.name}`);
      
      // Test token verification
      const tokenVerify = await makeRequest(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userLogin.headers['set-cookie']?.[0]?.split('=')[1]?.split(';')[0] || 'no-token'}`
        },
        body: { token: 'test-token' }
      });
      
      console.log(`Token verification: ${tokenVerify.status}`);
      
      return { userToken: userLogin.headers['set-cookie']?.[0] };
    } else {
      console.log(`❌ User login failed: ${userLogin.status} - ${JSON.stringify(userLogin.data)}`);
    }
    
    // Login admin
    const adminLogin = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: {
        email: testAdmin.email,
        password: testAdmin.password
      }
    });
    
    if (adminLogin.status === 200) {
      console.log(`✅ Admin login: ${adminLogin.status} - Welcome ${adminLogin.data.user.name}`);
      return { 
        userToken: userLogin.headers['set-cookie']?.[0],
        adminToken: adminLogin.headers['set-cookie']?.[0]
      };
    }
    
    return {};
  } catch (error) {
    console.log(`❌ Authentication failed: ${error.message}`);
    return {};
  }
}

async function testUserManagement(tokens) {
  console.log('\n👥 Testing User Management...');
  
  if (!tokens.adminToken) {
    console.log('⚠️ Skipping user management tests - no admin token');
    return;
  }
  
  try {
    // Get all users (admin only)
    const allUsers = await makeRequest(`${API_BASE}/api/users`, {
      headers: {
        'Cookie': tokens.adminToken
      }
    });
    
    if (allUsers.status === 200) {
      console.log(`✅ Get all users: ${allUsers.status} - Found ${allUsers.data.users?.length || 0} users`);
    } else {
      console.log(`❌ Get all users failed: ${allUsers.status} - ${JSON.stringify(allUsers.data)}`);
    }
    
    // Test user can access their own data
    if (tokens.userToken) {
      const userProfile = await makeRequest(`${API_BASE}/api/auth/me`, {
        headers: {
          'Cookie': tokens.userToken
        }
      });
      
      if (userProfile.status === 200) {
        console.log(`✅ User profile access: ${userProfile.status} - ${userProfile.data.user?.name}`);
      } else {
        console.log(`❌ User profile access failed: ${userProfile.status}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ User management failed: ${error.message}`);
  }
}

async function testServiceIntegration() {
  console.log('\n🔗 Testing Service Integration...');
  
  try {
    // Test that auth routes are no longer handled by main app
    const mainAppAuth = await makeRequest(`${API_BASE}/api/auth/nonexistent`);
    console.log(`Main app auth route (should 404): ${mainAppAuth.status}`);
    
    // Test other services still work
    const mediaHealth = await makeRequest(`${API_BASE}/health/media-service`);
    console.log(`Media service health: ${mediaHealth.status}`);
    
    const refHealth = await makeRequest(`${API_BASE}/health/reference-service`);
    console.log(`Reference service health: ${refHealth.status}`);
    
  } catch (error) {
    console.log(`❌ Service integration test failed: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting User Service Integration Tests');
  console.log(`API Gateway: ${API_BASE}`);
  console.log(`Direct Service: ${USER_SERVICE_DIRECT}`);
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health checks failed - stopping tests');
    process.exit(1);
  }
  
  await testUserRegistration();
  const tokens = await testAuthentication();
  await testUserManagement(tokens);
  await testServiceIntegration();
  
  console.log('\n✅ User Service Integration Tests Completed');
  console.log('\n📋 Next Steps:');
  console.log('1. Check logs: docker-compose logs user-service');
  console.log('2. Test authentication flow in main app');
  console.log('3. Verify JWT tokens work across services');
}

// Run tests
runTests().catch(console.error);