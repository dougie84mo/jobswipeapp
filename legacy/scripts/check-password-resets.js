const { sequelize, PasswordReset } = require('../models');

async function checkPasswordResets() {
  try {
    console.log('Checking database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    console.log('\nChecking database tables...');
    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    console.log('Tables in database:');
    tables.forEach(table => {
      console.log(`- ${table.name}`);
    });

    console.log('\nChecking PasswordResets table...');
    const hasPasswordResetsTable = tables.some(table => table.name === 'PasswordResets');
    
    if (hasPasswordResetsTable) {
      console.log('PasswordResets table exists.');
      
      try {
        console.log('\nAttempting to create a test password reset record...');
        const testReset = await PasswordReset.create({
          userId: '9d509cd1-6dd0-47c6-8539-a30bbf0cad71', // jobseeker1@example.com
          token: 'test-token-' + Date.now(),
          expiresAt: new Date(Date.now() + 3600000),
          isUsed: false
        });
        
        console.log('Test record created successfully:', testReset.id);
        
        console.log('\nRetrieving all password reset records...');
        const resets = await PasswordReset.findAll();
        console.log(`Found ${resets.length} password reset records:`);
        resets.forEach(reset => {
          console.log(`- ID: ${reset.id}, User ID: ${reset.userId}, Token: ${reset.token.substring(0, 10)}..., Expires: ${reset.expiresAt}, Used: ${reset.isUsed}`);
        });
      } catch (error) {
        console.error('Error working with PasswordReset model:', error);
      }
    } else {
      console.error('PasswordResets table does not exist!');
    }
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await sequelize.close();
  }
}

checkPasswordResets(); 