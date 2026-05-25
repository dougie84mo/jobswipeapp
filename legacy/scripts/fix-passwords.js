const { sequelize, User } = require('../models');
const bcrypt = require('bcryptjs');

async function fixPasswords() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find all users
    const users = await User.findAll();
    console.log(`Found ${users.length} users in the database.`);

    // Update each user's password
    for (const user of users) {
      console.log(`Updating password for user: ${user.email}`);
      
      // Generate a consistent salt
      const salt = await bcrypt.genSalt(10);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Update the user
      await user.update({ password: hashedPassword });
      
      // Verify the password works
      const isMatch = await bcrypt.compare('password123', hashedPassword);
      console.log(`Password verification for ${user.email}: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    }

    console.log('All passwords have been updated successfully.');
  } catch (error) {
    console.error('Error fixing passwords:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the function
fixPasswords(); 