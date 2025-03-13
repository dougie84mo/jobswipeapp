const { sequelize } = require('../models');

async function fixDatabaseSchema() {
  try {
    console.log('=== FIXING DATABASE SCHEMA ===');
    
    // Get the query interface
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if recruiterId column exists in Companies table
    console.log('\nChecking if recruiterId column exists in Companies table...');
    
    try {
      const companiesSchema = await queryInterface.describeTable('Companies');
      
      if (companiesSchema.recruiterId) {
        console.log('recruiterId column found in Companies table. Removing it...');
        
        await queryInterface.removeColumn('Companies', 'recruiterId');
        console.log('✓ recruiterId column removed from Companies table');
      } else {
        console.log('✓ recruiterId column does not exist in Companies table');
      }
    } catch (error) {
      console.error('Error checking Companies table:', error);
    }
    
    // Check if there are any foreign key constraints related to recruiterId
    console.log('\nChecking for foreign key constraints related to recruiterId...');
    
    try {
      // For SQLite, we need to use a raw query to get foreign key info
      const foreignKeys = await sequelize.query(
        `SELECT * FROM sqlite_master WHERE type='table' AND sql LIKE '%FOREIGN KEY%recruiterId%'`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (foreignKeys.length > 0) {
        console.log(`Found ${foreignKeys.length} tables with recruiterId foreign keys:`);
        
        for (const table of foreignKeys) {
          console.log(`- ${table.name}`);
          console.log(`  SQL: ${table.sql}`);
        }
      } else {
        console.log('✓ No foreign key constraints related to recruiterId found');
      }
    } catch (error) {
      console.error('Error checking foreign key constraints:', error);
    }
    
    // Check if there are any indexes related to recruiterId
    console.log('\nChecking for indexes related to recruiterId...');
    
    try {
      // For SQLite, we need to use a raw query to get index info
      const indexes = await sequelize.query(
        `SELECT * FROM sqlite_master WHERE type='index' AND sql LIKE '%recruiterId%'`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (indexes.length > 0) {
        console.log(`Found ${indexes.length} indexes related to recruiterId:`);
        
        for (const index of indexes) {
          console.log(`- ${index.name}`);
          console.log(`  SQL: ${index.sql}`);
        }
      } else {
        console.log('✓ No indexes related to recruiterId found');
      }
    } catch (error) {
      console.error('Error checking indexes:', error);
    }
    
    // Verify the relationships between tables
    console.log('\nVerifying relationships between tables...');
    
    try {
      // Check RecruiterProfiles table
      const recruiterProfilesSchema = await queryInterface.describeTable('RecruiterProfiles');
      
      if (recruiterProfilesSchema.companyId) {
        console.log('✓ RecruiterProfiles table has companyId column');
      } else {
        console.log('✗ RecruiterProfiles table does not have companyId column. Adding it...');
        
        await queryInterface.addColumn('RecruiterProfiles', 'companyId', {
          type: sequelize.Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Companies',
            key: 'id'
          }
        });
        
        console.log('✓ companyId column added to RecruiterProfiles table');
      }
      
      // Check Jobs table
      const jobsSchema = await queryInterface.describeTable('Jobs');
      
      if (jobsSchema.companyId) {
        console.log('✓ Jobs table has companyId column');
      } else {
        console.log('✗ Jobs table does not have companyId column. Adding it...');
        
        await queryInterface.addColumn('Jobs', 'companyId', {
          type: sequelize.Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Companies',
            key: 'id'
          }
        });
        
        console.log('✓ companyId column added to Jobs table');
      }
      
      if (jobsSchema.recruiterId) {
        console.log('✓ Jobs table has recruiterId column');
      } else {
        console.log('✗ Jobs table does not have recruiterId column. Adding it...');
        
        await queryInterface.addColumn('Jobs', 'recruiterId', {
          type: sequelize.Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'RecruiterProfiles',
            key: 'id'
          }
        });
        
        console.log('✓ recruiterId column added to Jobs table');
      }
    } catch (error) {
      console.error('Error verifying relationships:', error);
    }
    
    console.log('\n=== DATABASE SCHEMA FIX COMPLETE ===');
  } catch (error) {
    console.error('Error fixing database schema:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 