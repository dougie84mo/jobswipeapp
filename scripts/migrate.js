require('dotenv').config();
const { sequelize } = require('../models');

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Sync all models with the database
    await sequelize.sync({ alter: true });
    
    console.log('Database migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
}

migrate(); 