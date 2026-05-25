const { sequelize, User } = require('../models');
const bcrypt = require('bcryptjs');

async function fixPasswordsDirect() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find all users
    const users = await User.findAll();
    console.log(`Found ${users.length} users in the database.`);

    // Update each user's password directly in the database
    for (const user of users) {
      console.log(`\nProcessing user: ${user.email}`);
      
      // Generate a new hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      console.log(`Generated hash: ${hashedPassword}`);
      
      // Update directly in the database to bypass hooks
      await sequelize.query(
        `UPDATE "Users" SET "password" = ? WHERE "id" = ?`,
        {
          replacements: [hashedPassword, user.id],
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log(`Password updated directly in database.`);
      
      // Verify the update
      const updatedUser = await User.findByPk(user.id);
      console.log(`Updated hash in database: ${updatedUser.password}`);
      
      // Test the password
      const isMatch = await bcrypt.compare('password123', updatedUser.password);
      console.log(`Password verification: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    }

    console.log('\nAll passwords have been updated successfully.');
  } catch (error) {
    console.error('Error fixing passwords:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the function
fixPasswordsDirect(); 