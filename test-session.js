const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const token = jwt.sign({id: 'test-user-123', role: 'admin'}, 'your-secret-key-here');

// Test session check with the session ID from QR generation
const sessionId = 'd7856e11-6a93-43b3-9727-e9ffa25f7d85';

fetch(`http://localhost:3001/api/mobile-upload/qr?sessionId=${sessionId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => {
  console.log('📱 Session status:', data);
})
.catch(err => {
  console.error('❌ Error:', err.message);
});