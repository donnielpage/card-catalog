const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Create a test JWT token
const testUser = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  tenant_id: 'test-tenant',
  tenant_slug: 'test-tenant',
  tenant_name: 'Test Organization'
};

const jwtSecret = 'your-secret-key-here';
const token = jwt.sign(testUser, jwtSecret, { expiresIn: '1h' });

console.log('🔑 Generated test JWT token for Reference Data Service');
console.log('👤 Test user:', testUser);

// Test Players API
async function testPlayersAPI() {
  console.log('\n👥 Testing Players API...');
  
  try {
    // Test GET all players
    console.log('📋 Testing GET /api/players...');
    const playersResponse = await fetch('http://localhost:3002/api/players', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (playersResponse.ok) {
      const players = await playersResponse.json();
      console.log(`✅ GET players successful! Found ${players.length} players`);
      if (players.length > 0) {
        console.log('📄 Sample player:', players[0]);
      }
    } else {
      const error = await playersResponse.json();
      console.log('❌ GET players failed:', error);
    }
    
    // Test POST new player
    console.log('📝 Testing POST /api/players...');
    const newPlayer = {
      firstname: 'Test',
      lastname: 'Player',
      dob: '1990-01-15'
    };
    
    const createResponse = await fetch('http://localhost:3002/api/players', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newPlayer)
    });
    
    if (createResponse.ok) {
      const createdPlayer = await createResponse.json();
      console.log('✅ POST player successful!', createdPlayer);
      return createdPlayer.id;
    } else {
      const error = await createResponse.json();
      console.log('❌ POST player failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Players API error:', error.message);
    return null;
  }
}

// Test Teams API
async function testTeamsAPI() {
  console.log('\n🏟️  Testing Teams API...');
  
  try {
    // Test GET all teams
    console.log('📋 Testing GET /api/teams...');
    const teamsResponse = await fetch('http://localhost:3002/api/teams', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (teamsResponse.ok) {
      const teams = await teamsResponse.json();
      console.log(`✅ GET teams successful! Found ${teams.length} teams`);
      if (teams.length > 0) {
        console.log('📄 Sample team:', teams[0]);
      }
    } else {
      const error = await teamsResponse.json();
      console.log('❌ GET teams failed:', error);
    }
    
    // Test POST new team
    console.log('📝 Testing POST /api/teams...');
    const newTeam = {
      city: 'Test City',
      teamname: 'Test Team',
      mascot: 'Test Mascot',
      primary_color: '#FF0000',
      secondary_color: '#0000FF'
    };
    
    const createResponse = await fetch('http://localhost:3002/api/teams', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTeam)
    });
    
    if (createResponse.ok) {
      const createdTeam = await createResponse.json();
      console.log('✅ POST team successful!', createdTeam);
      return createdTeam.id;
    } else {
      const error = await createResponse.json();
      console.log('❌ POST team failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Teams API error:', error.message);
    return null;
  }
}

// Test Manufacturers API
async function testManufacturersAPI() {
  console.log('\n🏭 Testing Manufacturers API...');
  
  try {
    // Test GET all manufacturers
    console.log('📋 Testing GET /api/manufacturers...');
    const manufacturersResponse = await fetch('http://localhost:3002/api/manufacturers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (manufacturersResponse.ok) {
      const manufacturers = await manufacturersResponse.json();
      console.log(`✅ GET manufacturers successful! Found ${manufacturers.length} manufacturers`);
      if (manufacturers.length > 0) {
        console.log('📄 Sample manufacturer:', manufacturers[0]);
      }
    } else {
      const error = await manufacturersResponse.json();
      console.log('❌ GET manufacturers failed:', error);
    }
    
    // Test POST new manufacturer
    console.log('📝 Testing POST /api/manufacturers...');
    const newManufacturer = {
      company: 'Test Card Company',
      year: 2024,
      subsetname: 'Test Series'
    };
    
    const createResponse = await fetch('http://localhost:3002/api/manufacturers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newManufacturer)
    });
    
    if (createResponse.ok) {
      const createdManufacturer = await createResponse.json();
      console.log('✅ POST manufacturer successful!', createdManufacturer);
      return createdManufacturer.id;
    } else {
      const error = await createResponse.json();
      console.log('❌ POST manufacturer failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Manufacturers API error:', error.message);
    return null;
  }
}

// Test individual item retrieval
async function testIndividualItems(playerId, teamId, manufacturerId) {
  console.log('\n🔍 Testing Individual Item Retrieval...');
  
  const tests = [
    { name: 'Player', id: playerId, endpoint: 'players' },
    { name: 'Team', id: teamId, endpoint: 'teams' },
    { name: 'Manufacturer', id: manufacturerId, endpoint: 'manufacturers' }
  ];
  
  for (const test of tests) {
    if (test.id) {
      try {
        const response = await fetch(`http://localhost:3002/api/${test.endpoint}/${test.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const item = await response.json();
          console.log(`✅ GET ${test.name} ${test.id} successful:`, item);
        } else {
          const error = await response.json();
          console.log(`❌ GET ${test.name} ${test.id} failed:`, error);
        }
      } catch (error) {
        console.error(`❌ ${test.name} retrieval error:`, error.message);
      }
    }
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Reference Data Service Tests...\n');
  
  const playerId = await testPlayersAPI();
  const teamId = await testTeamsAPI();
  const manufacturerId = await testManufacturersAPI();
  
  await testIndividualItems(playerId, teamId, manufacturerId);
  
  console.log('\n✨ Reference Data Service test suite completed!');
  console.log('\n📊 Service Summary:');
  console.log('🚀 Service: Running on port 3002');
  console.log('🗄️  Database: SQLite (shared with main app)');
  console.log('🔐 Authentication: JWT-based');
  console.log('🏢 Multi-tenant: Configurable');
  console.log('📡 APIs: Players, Teams, Manufacturers');
}

runTests();