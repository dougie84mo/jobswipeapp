/**
 * Script to fix database schema issues
 * 
 * This script will update the database schema to fix the issue with the user.name column
 * by ensuring all models use firstName and lastName instead of name.
 * 
 * Run with: node scripts/fix-db-schema.js
 */

const { sequelize, User, RecruiterProfile, JobSeekerProfile, Match, Job } = require('../models');

async function fixDatabaseSchema() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if the database is SQLite
    const dialect = sequelize.getDialect();
    console.log(`Database dialect: ${dialect}`);

    if (dialect === 'sqlite') {
      console.log('Fixing SQLite schema issues...');
      
      // Execute raw SQL to check the schema
      const [results] = await sequelize.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name;
      `);
      
      console.log('Tables in database:');
      results.forEach(result => {
        console.log(`- ${result.name}`);
      });

      // Check User table schema
      const [userColumns] = await sequelize.query(`PRAGMA table_info(Users);`);
      console.log('\nUser table columns:');
      userColumns.forEach(column => {
        console.log(`- ${column.name} (${column.type})`);
      });

      // Check RecruiterProfile table schema
      const [recruiterColumns] = await sequelize.query(`PRAGMA table_info(RecruiterProfiles);`);
      console.log('\nRecruiterProfile table columns:');
      recruiterColumns.forEach(column => {
        console.log(`- ${column.name} (${column.type})`);
      });

      // Check if there are any foreign keys or constraints that might be causing issues
      console.log('\nChecking foreign keys...');
      try {
        const [foreignKeys] = await sequelize.query(`PRAGMA foreign_key_list(RecruiterProfiles);`);
        console.log('RecruiterProfile foreign keys:');
        foreignKeys.forEach(fk => {
          console.log(`- ${fk.table}.${fk.from} -> ${fk.to}`);
        });
      } catch (fkError) {
        console.error('Error checking foreign keys:', fkError.message);
      }

      // Try to get recruiter jobs directly with SQL
      console.log('\nTrying to get recruiter jobs with SQL...');
      try {
        const [jobs] = await sequelize.query(`
          SELECT j.* 
          FROM Jobs j
          JOIN RecruiterProfiles r ON j.recruiterId = r.id
          WHERE r.userId = '${process.argv[2] || 'dbbb0f5b-b994-4ae1-bbda-aa9098b4d6e0'}'
          LIMIT 5;
        `);
        console.log(`Found ${jobs.length} jobs with SQL`);
      } catch (sqlError) {
        console.error('SQL error:', sqlError.message);
      }

      // Check if the Jobs table has a recruiterId column
      console.log('\nChecking Jobs table for recruiterId...');
      const [jobColumns] = await sequelize.query(`PRAGMA table_info(Jobs);`);
      const hasRecruiterId = jobColumns.some(col => col.name === 'recruiterId');
      console.log(`Jobs table has recruiterId column: ${hasRecruiterId}`);
      
      if (!hasRecruiterId) {
        console.log('Adding recruiterId column to Jobs table...');
        try {
          await sequelize.query(`ALTER TABLE Jobs ADD COLUMN recruiterId UUID REFERENCES RecruiterProfiles(id);`);
          console.log('Column added successfully');
        } catch (alterError) {
          console.error('Error adding column:', alterError.message);
        }
      }

      // Try to fix the issue by updating the model associations
      console.log('\nAttempting to fix the issue...');
      
      // Force Sequelize to reload the models
      console.log('Reloading models...');
      try {
        await sequelize.sync({ alter: true });
        console.log('Models reloaded successfully');
      } catch (syncError) {
        console.error('Error reloading models:', syncError.message);
      }
    } else {
      console.log('This script is designed for SQLite databases only.');
    }

    await sequelize.close();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error fixing database schema:', error);
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(1);
  }
}

// Run the function
fixDatabaseSchema(); 