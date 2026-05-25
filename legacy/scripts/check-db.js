const { sequelize, User, JobSeekerProfile, RecruiterProfile, Company, Job, Subscription, PasswordReset } = require('../models');

const checkDatabase = async () => {
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

    // Count records in each table
    const userCount = await User.count();
    const jobseekerProfileCount = await JobSeekerProfile.count();
    const recruiterProfileCount = await RecruiterProfile.count();
    const companyCount = await Company.count();
    const jobCount = await Job.count();
    const subscriptionCount = await Subscription.count();
    
    console.log('=== DATABASE CONTENTS ===');
    console.log(`Users: ${userCount}`);
    console.log(`JobSeekerProfiles: ${jobseekerProfileCount}`);
    console.log(`RecruiterProfiles: ${recruiterProfileCount}`);
    console.log(`Companies: ${companyCount}`);
    console.log(`Jobs: ${jobCount}`);
    console.log(`Subscriptions: ${subscriptionCount}`);
    console.log('========================');
    
    // Get sample data
    console.log('\n=== SAMPLE DATA ===');
    
    // Sample user
    const sampleUser = await User.findOne({ where: { email: 'jobseeker1@example.com' } });
    if (sampleUser) {
      console.log('Sample User:');
      console.log(JSON.stringify(sampleUser, null, 2));
    } else {
      console.log('No sample user found with email jobseeker1@example.com');
    }
    
    // Sample job
    try {
      const sampleJob = await Job.findOne();
      if (sampleJob) {
        console.log('\nSample Job:');
        console.log(JSON.stringify({
          id: sampleJob.id,
          title: sampleJob.title,
          companyId: sampleJob.companyId,
          recruiterId: sampleJob.recruiterId,
          description: sampleJob.description.substring(0, 50) + '...',
          jobType: sampleJob.jobType,
          isRemote: sampleJob.isRemote,
          isHybrid: sampleJob.isHybrid
        }, null, 2));
      } else {
        console.log('No sample job found');
      }
    } catch (jobError) {
      console.error('Error retrieving sample job:', jobError);
    }
    
    // Sample company
    try {
      const sampleCompany = await Company.findOne();
      if (sampleCompany) {
        console.log('\nSample Company:');
        console.log(JSON.stringify({
          id: sampleCompany.id,
          name: sampleCompany.name,
          industry: sampleCompany.industry,
          location: sampleCompany.location
        }, null, 2));
      } else {
        console.log('No sample company found');
      }
    } catch (companyError) {
      console.error('Error retrieving sample company:', companyError);
    }
    
    // Close database connection
    await sequelize.close();
    
  } catch (error) {
    console.error('Database check failed:', error);
  }
};

// Run the check function
checkDatabase(); 