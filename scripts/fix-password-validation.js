const { sequelize, User } = require('../models');
const bcrypt = require('bcryptjs');

async function fixPasswordValidation() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find all users
    const users = await User.findAll();
    console.log(`Found ${users.length} users in the database.`);

    // Check bcrypt version and settings
    console.log('\nBcrypt Information:');
    console.log(`- Bcrypt version: ${bcrypt.version || 'Unknown'}`);
    console.log(`- Default rounds: ${bcrypt.getRounds('$2a$10$abcdefghijklmnopqrstuvwxyz012345') || 'Unknown'}`);

    // Test password validation for each user
    console.log('\nTesting password validation for each user:');
    
    const plainPassword = 'password123';
    console.log(`Test password: ${plainPassword}`);
    
    for (const user of users) {
      console.log(`\nUser: ${user.email}`);
      console.log(`Current password hash: ${user.password}`);
      
      // Test current hash
      try {
        const isMatch = await bcrypt.compare(plainPassword, user.password);
        console.log(`Password validation with current hash: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.error(`Error comparing password: ${error.message}`);
      }
      
      // Create a new hash with controlled parameters
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(plainPassword, salt);
      console.log(`New hash generated: ${newHash}`);
      
      // Test new hash
      const isNewMatch = await bcrypt.compare(plainPassword, newHash);
      console.log(`Password validation with new hash: ${isNewMatch ? 'SUCCESS' : 'FAILED'}`);
      
      // Update user with new hash
      await user.update({ password: newHash });
      console.log(`User password updated with new hash.`);
      
      // Verify the update
      const updatedUser = await User.findByPk(user.id);
      console.log(`Updated hash in database: ${updatedUser.password}`);
      
      // Final validation check
      const finalCheck = await bcrypt.compare(plainPassword, updatedUser.password);
      console.log(`Final validation check: ${finalCheck ? 'SUCCESS' : 'FAILED'}`);
    }

    console.log('\nPassword validation fix completed.');
  } catch (error) {
    console.error('Error fixing password validation:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the function
fixPasswordValidation(); 