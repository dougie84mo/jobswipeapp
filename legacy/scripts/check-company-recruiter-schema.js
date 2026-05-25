'use strict';

require('dotenv').config();
const db = require('../models');
const { QueryTypes } = require('sequelize');

async function checkCompanyRecruiterSchema() {
  try {
    console.log('Checking CompanyRecruiter table schema...');
    
    // Get the actual columns from the database
    const tableInfo = await db.sequelize.query(
      "PRAGMA table_info(CompanyRecruiters)",
      { type: QueryTypes.SELECT }
    );
    
    console.log('CompanyRecruiters table columns:');
    console.log(tableInfo);
    
    // Display the raw SQL that would create this table
    const createTableSQL = await db.sequelize.query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='CompanyRecruiters'",
      { type: QueryTypes.SELECT }
    );
    
    console.log('Create Table SQL:');
    console.log(createTableSQL[0]?.sql);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    process.exit(0);
  }
}

checkCompanyRecruiterSchema(); 