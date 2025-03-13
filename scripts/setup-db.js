require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false
};

// Create database connection
const sequelize = new Sequelize(dbConfig);

// Function to create uploads directory structure
function createUploadDirectories() {
  const dirs = [
    'uploads',
    'uploads/profiles',
    'uploads/companies',
    'uploads/messages'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } else {
      console.log(`Directory already exists: ${dirPath}`);
    }
  });
}

// Main setup function
async function setup() {
  console.log('Starting JobActual database setup...');

  // Test connection to the database
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }

  // Create upload directories
  createUploadDirectories();

  console.log('\nSetup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Run migrations: npx sequelize-cli db:migrate');
  console.log('2. Seed the database: npx sequelize-cli db:seed:all');
  console.log('3. Start the server: npm run dev');

  // Close the connection
  await sequelize.close();
}

// Run setup
setup().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
}); 