#!/usr/bin/env node

const https = require('https');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const SYSTEM_SERVICE_DIRECT = process.env.SYSTEM_SERVICE_DIRECT || 'http://localhost:3004';

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = require(url.startsWith('https') ? 'https' : 'http').request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
    const directHealth = await makeRequest(`${SYSTEM_SERVICE_DIRECT}/health`);
    console.log(`✅ Direct health: ${directHealth.status} - ${directHealth.data.status}`);
    
    // Through API Gateway  
    const gatewayHealth = await makeRequest(`${API_BASE}/health/system-service`);
    console.log(`✅ Gateway health: ${gatewayHealth.status} - ${gatewayHealth.data.status}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function testAuthenticationRequired() {
  console.log('\n🔒 Testing Authentication Requirements...');
  
  try {
    // Test that endpoints require authentication
    const noAuthResponse = await makeRequest(`${API_BASE}/api/system/version`);
    
    if (noAuthResponse.status === 401) {
      console.log(`✅ Authentication required: ${noAuthResponse.status} - ${noAuthResponse.data.error}`);
    } else {
      console.log(`⚠️ Expected 401, got: ${noAuthResponse.status}`);
    }
    
    // Test direct service
    const directNoAuth = await makeRequest(`${SYSTEM_SERVICE_DIRECT}/api/system/version`);
    
    if (directNoAuth.status === 401) {
      console.log(`✅ Direct service auth required: ${directNoAuth.status}`);
    } else {
      console.log(`⚠️ Direct service should require auth, got: ${directNoAuth.status}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
    return false;
  }
}

async function testServiceEndpoints() {
  console.log('\n🌐 Testing Service Endpoints...');
  
  try {
    // Test root endpoint
    const rootResponse = await makeRequest(`${SYSTEM_SERVICE_DIRECT}/`);
    
    if (rootResponse.status === 200) {
      console.log(`✅ Root endpoint: ${rootResponse.status} - ${rootResponse.data.service}`);
      console.log(`📋 Available endpoints: ${rootResponse.data.endpoints?.length || 0}`);
    } else {
      console.log(`❌ Root endpoint failed: ${rootResponse.status}`);
    }
    
    // Test 404 handling
    const notFoundResponse = await makeRequest(`${SYSTEM_SERVICE_DIRECT}/nonexistent`);
    
    if (notFoundResponse.status === 404) {
      console.log(`✅ 404 handling: ${notFoundResponse.status} - ${notFoundResponse.data.error}`);
    } else {
      console.log(`⚠️ Expected 404, got: ${notFoundResponse.status}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Service endpoints test failed: ${error.message}`);
    return false;
  }
}

async function testAPIGatewayRouting() {
  console.log('\n🚦 Testing API Gateway Routing...');
  
  try {
    // Test that system routes are properly routed
    const systemRouteResponse = await makeRequest(`${API_BASE}/api/system/nonexistent`);
    
    // Should get 401 (auth required) not 404 (route not found)
    if (systemRouteResponse.status === 401) {
      console.log(`✅ API Gateway routing: ${systemRouteResponse.status} - Routes to system service`);
    } else if (systemRouteResponse.status === 404) {
      console.log(`❌ API Gateway routing issue: Routes not configured properly`);
    } else {
      console.log(`⚠️ Unexpected response: ${systemRouteResponse.status}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ API Gateway routing test failed: ${error.message}`);
    return false;
  }
}

async function testServiceDiscovery() {
  console.log('\n🔍 Testing Service Discovery...');
  
  try {
    // Check if other services are discoverable from system service
    const mediaHealth = await makeRequest(`${SYSTEM_SERVICE_DIRECT.replace('3004', '3001')}/health`);
    const userHealth = await makeRequest(`${SYSTEM_SERVICE_DIRECT.replace('3004', '3003')}/health`);
    
    if (mediaHealth.status === 200) {
      console.log(`✅ Media service reachable: ${mediaHealth.data.status}`);
    } else {
      console.log(`⚠️ Media service not reachable: ${mediaHealth.status}`);
    }
    
    if (userHealth.status === 200) {
      console.log(`✅ User service reachable: ${userHealth.data.status}`);
    } else {
      console.log(`⚠️ User service not reachable: ${userHealth.status}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Service discovery test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting System Service Integration Tests');
  console.log(`API Gateway: ${API_BASE}`);
  console.log(`Direct Service: ${SYSTEM_SERVICE_DIRECT}`);
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health checks failed - stopping tests');
    return;
  }
  
  await testAuthenticationRequired();
  await testServiceEndpoints();
  await testAPIGatewayRouting();
  await testServiceDiscovery();
  
  console.log('\n✅ System Service Integration Tests Completed');
  console.log('\n📋 Next Steps:');
  console.log('1. Test with actual admin JWT token');
  console.log('2. Test system monitoring endpoints');
  console.log('3. Verify service health checking works');
  console.log('4. Test backup functionality');
}

// Run tests
runTests().catch(console.error);