const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

// Create a test JWT token
const testUser = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  tenant_id: 'test-tenant'
};

const jwtSecret = 'your-secret-key-here';
const token = jwt.sign(testUser, jwtSecret, { expiresIn: '1h' });

console.log('🔑 Generated test JWT token');
console.log('👤 Test user:', testUser);

// Test QR generation
async function testQRGeneration() {
  console.log('\n📱 Testing QR code generation...');
  
  try {
    const response = await fetch('http://localhost:3001/api/mobile-upload/qr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ QR generation successful!');
      console.log('📋 Session ID:', result.sessionId);
      console.log('🔗 Mobile URL:', result.mobileUrl);
      console.log('⏰ Expires at:', result.expiresAt);
      console.log('📱 QR Code generated:', result.qrCode ? 'Yes' : 'No');
      return result.sessionId;
    } else {
      console.log('❌ QR generation failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ QR generation error:', error.message);
    return null;
  }
}

// Test file upload with form data
async function testFileUpload() {
  console.log('\n📁 Testing file upload...');
  
  // Create a small test image file
  const testImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  
  try {
    const form = new FormData();
    form.append('image', testImageContent, {
      filename: 'test.png',
      contentType: 'image/png'
    });

    const response = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ File upload successful!');
      console.log('📸 Image URL:', result.imageUrl);
      console.log('📄 Filename:', result.filename);
      console.log('💬 Message:', result.message);
      return result.imageUrl;
    } else {
      console.log('❌ File upload failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ File upload error:', error.message);
    return null;
  }
}

// Test file serving
async function testFileServing(imageUrl) {
  if (!imageUrl) return;
  
  console.log('\n🖼️  Testing file serving...');
  
  try {
    const response = await fetch(`http://localhost:3001${imageUrl}`);
    
    if (response.ok) {
      console.log('✅ File serving successful!');
      console.log('📏 Content-Length:', response.headers.get('content-length'));
      console.log('🏷️  Content-Type:', response.headers.get('content-type'));
    } else {
      console.log('❌ File serving failed:', response.status);
    }
  } catch (error) {
    console.error('❌ File serving error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Media Service Tests...\n');
  
  const sessionId = await testQRGeneration();
  const imageUrl = await testFileUpload();
  await testFileServing(imageUrl);
  
  console.log('\n✨ Test suite completed!');
}

// Check if node-fetch and form-data are available
try {
  runTests();
} catch (error) {
  console.log('❌ Missing dependencies. Please install:');
  console.log('npm install node-fetch form-data');
  console.log('\nFalling back to basic curl tests...');
  
  console.log('\n🔑 JWT Token for manual testing:');
  console.log(token);
  console.log('\n📋 Test with curl:');
  console.log(`curl -H "Authorization: Bearer ${token}" -X POST http://localhost:3001/api/mobile-upload/qr`);
}