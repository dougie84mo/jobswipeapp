const { sequelize, User } = require('../models');

async function checkCredentials() {
  try {
    console.log('Checking database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find one jobseeker
    console.log('\nFinding one jobseeker...');
    const jobseeker = await User.findOne({
      where: { userType: 'jobseeker' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'userType', 'createdAt']
    });

    if (jobseeker) {
      console.log('Jobseeker found:');
      console.log(`- ID: ${jobseeker.id}`);
      console.log(`- Email: ${jobseeker.email}`);
      console.log(`- Name: ${jobseeker.firstName} ${jobseeker.lastName}`);
      console.log(`- Created: ${jobseeker.createdAt}`);
      
      // Get the raw password from the seed data
      console.log('\nFor testing, use the following credentials:');
      console.log(`- Email: ${jobseeker.email}`);
      console.log('- Password: password123');
    } else {
      console.log('No jobseeker found in the database.');
    }

    // Find one recruiter
    console.log('\nFinding one recruiter...');
    const recruiter = await User.findOne({
      where: { userType: 'recruiter' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'userType', 'createdAt']
    });

    if (recruiter) {
      console.log('Recruiter found:');
      console.log(`- ID: ${recruiter.id}`);
      console.log(`- Email: ${recruiter.email}`);
      console.log(`- Name: ${recruiter.firstName} ${recruiter.lastName}`);
      console.log(`- Created: ${recruiter.createdAt}`);
      
      // Get the raw password from the seed data
      console.log('\nFor testing, use the following credentials:');
      console.log(`- Email: ${recruiter.email}`);
      console.log('- Password: password123');
    } else {
      console.log('No recruiter found in the database.');
    }

  } catch (error) {
    console.error('Error checking credentials:', error);
  } finally {
    await sequelize.close();
  }
}

checkCredentials(); 