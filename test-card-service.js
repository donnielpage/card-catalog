const axios = require('axios');

const CARD_SERVICE_URL = 'http://localhost:3006';
const GATEWAY_URL = 'http://localhost:8080';

// Test data
const testCard = {
  cardnumber: 'TEST-001',
  year: 2023,
  description: 'Test card for service integration',
  grade: 'MINT'
};

async function testCardService() {
  console.log('🧪 Testing Card Service Integration...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${CARD_SERVICE_URL}/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}`);
    console.log(`   Service: ${healthResponse.data.service}`);
    console.log(`   Version: ${healthResponse.data.version}\n`);

    // Test 2: Gateway health check
    console.log('2. Testing gateway health endpoint...');
    const gatewayHealthResponse = await axios.get(`${GATEWAY_URL}/health/card-service`);
    console.log(`✅ Gateway health check passed\n`);

    // Note: The following tests require authentication
    console.log('📝 Note: Card CRUD operations require authentication');
    console.log('   To test authenticated endpoints:');
    console.log('   1. Start all services: docker-compose up');
    console.log('   2. Create a user account and login');
    console.log('   3. Use the JWT token in Authorization header');
    console.log('   4. Include tenant context headers\n');

    console.log('🎉 Card Service integration tests completed successfully!');
    console.log('   ✅ Service is running on port 3006');
    console.log('   ✅ Health endpoints are working');
    console.log('   ✅ Gateway routing is configured');
    console.log('   ✅ Ready for authentication-based testing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run with authenticated token for full testing
async function testWithAuth() {
  const token = process.env.TEST_JWT_TOKEN;
  const tenantId = process.env.TEST_TENANT_ID || 'test-tenant';
  
  if (!token) {
    console.log('💡 Set TEST_JWT_TOKEN environment variable for authenticated tests');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'X-Tenant-Slug': 'test-tenant',
    'X-Tenant-Name': 'Test Tenant',
    'Content-Type': 'application/json'
  };

  try {
    console.log('\n🔒 Testing authenticated endpoints...\n');

    // Test: Get all cards
    console.log('3. Testing GET /cards...');
    const cardsResponse = await axios.get(`${GATEWAY_URL}/api/cards`, { headers });
    console.log(`✅ Get cards: Found ${cardsResponse.data.length} cards\n`);

    // Test: Get card stats
    console.log('4. Testing GET /cards/stats...');
    const statsResponse = await axios.get(`${GATEWAY_URL}/api/cards/stats`, { headers });
    console.log(`✅ Card stats: ${statsResponse.data.total_cards} total cards`);
    console.log(`   Years: ${Object.keys(statsResponse.data.cards_by_year).length}`);
    console.log(`   Grades: ${Object.keys(statsResponse.data.cards_by_grade).length}\n`);

    // Test: Search cards
    console.log('5. Testing GET /cards/search...');
    const searchResponse = await axios.get(`${GATEWAY_URL}/api/cards/search?q=test`, { headers });
    console.log(`✅ Search cards: Found ${searchResponse.data.length} results\n`);

    console.log('🎉 Authenticated Card Service tests completed successfully!');

  } catch (error) {
    console.error('❌ Authenticated test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run tests
if (require.main === module) {
  testCardService().then(() => {
    if (process.env.TEST_JWT_TOKEN) {
      return testWithAuth();
    }
  });
}

module.exports = { testCardService, testWithAuth };