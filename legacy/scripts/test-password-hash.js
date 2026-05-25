const bcrypt = require('bcryptjs');

async function testPasswordHash() {
  try {
    console.log('Testing password hashing and comparison...');
    
    // The password we want to test
    const password = 'password123';
    console.log(`Test password: ${password}`);
    
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    console.log(`Generated salt: ${salt}`);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(`Hashed password: ${hashedPassword}`);
    
    // Verify the password
    const isMatch = await bcrypt.compare(password, hashedPassword);
    console.log(`Password verification result: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    
    // Try with a different password
    const wrongPassword = 'wrongpassword';
    const isWrongMatch = await bcrypt.compare(wrongPassword, hashedPassword);
    console.log(`Wrong password verification result: ${isWrongMatch ? 'SUCCESS (this is bad)' : 'FAILED (this is good)'}`);
    
    // Test with a known hash from our database
    console.log('\nTesting with a hash from our database...');
    const dbHash = '$2a$10$Opw4T6x.AId/QYdeSVtYpu2gFF2OIlhD5AVp85vOVoNofgJz6C/eO';
    console.log(`Database hash: ${dbHash}`);
    
    const isDbMatch = await bcrypt.compare(password, dbHash);
    console.log(`Database password verification result: ${isDbMatch ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Error testing password hash:', error);
  }
}

// Run the function
testPasswordHash(); 