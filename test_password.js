// Test common passwords against the hardcoded hash
const bcrypt = require('bcryptjs');

const hash = '$2b$12$lObinT/d5hSSaiiiRDMSt.my82WpG8fE7BT22dUjNHeIY3H6LraCi';

const commonPasswords = [
  'admin',
  'admin123',
  'password',
  'password123',
  'cardvault',
  'test',
  'demo',
  '123456',
  'admin1',
  'pass'
];

async function testPasswords() {
  console.log('Testing common passwords against hardcoded hash...');
  console.log('Hash:', hash);
  console.log('');
  
  for (const password of commonPasswords) {
    try {
      const isValid = await bcrypt.compare(password, hash);
      console.log(`"${password}": ${isValid ? '✅ MATCH!' : '❌'}`);
      if (isValid) {
        console.log('');
        console.log('🎉 Found the password!');
        console.log('Try logging in with:');
        console.log('Username: admin');
        console.log(`Password: ${password}`);
        break;
      }
    } catch (error) {
      console.log(`"${password}": Error - ${error.message}`);
    }
  }
}

testPasswords();