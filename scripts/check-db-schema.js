const { sequelize } = require('../models');

async function checkDatabaseSchema() {
  try {
    console.log('=== CHECKING DATABASE SCHEMA ===');
    
    // Get the raw query interface
    const queryInterface = sequelize.getQueryInterface();
    
    // Check Companies table
    console.log('\nCompanies Table Schema:');
    const companiesSchema = await queryInterface.describeTable('Companies');
    console.log(JSON.stringify(companiesSchema, null, 2));
    
    // Check Jobs table
    console.log('\nJobs Table Schema:');
    const jobsSchema = await queryInterface.describeTable('Jobs');
    console.log(JSON.stringify(jobsSchema, null, 2));
    
    // Check RecruiterProfiles table
    console.log('\nRecruiterProfiles Table Schema:');
    const recruiterProfilesSchema = await queryInterface.describeTable('RecruiterProfiles');
    console.log(JSON.stringify(recruiterProfilesSchema, null, 2));
    
    // Check for any foreign key constraints
    console.log('\nChecking for foreign key constraints...');
    
    // For SQLite, we need to use a raw query to get foreign key info
    const foreignKeys = await sequelize.query(
      `SELECT * FROM sqlite_master WHERE type='table' AND (sql LIKE '%FOREIGN KEY%' OR sql LIKE '%REFERENCES%')`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Tables with foreign keys:');
    for (const table of foreignKeys) {
      console.log(`\n${table.name}:`);
      console.log(table.sql);
    }
    
    console.log('\n=== DATABASE SCHEMA CHECK COMPLETE ===');
  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the check
checkDatabaseSchema()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 