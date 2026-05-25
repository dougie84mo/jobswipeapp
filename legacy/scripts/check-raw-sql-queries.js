const { sequelize } = require('../models');

// Enable query logging
sequelize.options.logging = (sql) => {
  console.log('SQL Query:', sql);
};

async function checkRawSqlQueries() {
  try {
    console.log('=== CHECKING RAW SQL QUERIES ===');
    
    // Try to execute a simple query to see what SQL is generated
    console.log('\nExecuting a simple query to check SQL generation...');
    
    try {
      await sequelize.query(
        'SELECT * FROM Companies',
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log('✓ Simple query executed successfully');
    } catch (error) {
      console.error('Error executing simple query:', error);
    }
    
    // Try to execute a query that might cause the error
    console.log('\nExecuting a query that might cause the error...');
    
    try {
      await sequelize.query(
        'SELECT * FROM Companies WHERE recruiterId IS NOT NULL',
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log('✓ Query with recruiterId executed successfully (this is unexpected)');
    } catch (error) {
      console.error('Error executing query with recruiterId:', error);
      console.log('✓ This error is expected since recruiterId does not exist in Companies table');
    }
    
    // Check if there are any raw SQL queries in the codebase that might be causing the issue
    console.log('\nChecking for raw SQL queries in the database configuration...');
    
    // Print out the database configuration
    console.log('Database configuration:');
    const config = require('../config/database');
    console.log(JSON.stringify(config, null, 2));
    
    console.log('\n=== CHECK COMPLETE ===');
  } catch (error) {
    console.error('Error checking raw SQL queries:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the check
checkRawSqlQueries()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 