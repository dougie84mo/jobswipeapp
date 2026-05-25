/**
 * Script to list all users in the database
 * 
 * Run with: node scripts/list-users.js
 */

const { sequelize, User, RecruiterProfile, JobSeekerProfile } = require('../models');

async function listUsers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    console.log('\n=== ALL USERS ===');
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'userType', 'createdAt'],
      raw: true
    });

    users.forEach((user, index) => {
      console.log(`\n--- User ${index + 1} ---`);
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Email: ${user.email}`);
      console.log(`Type: ${user.userType}`);
      console.log(`Created: ${new Date(user.createdAt).toLocaleString()}`);
    });

    console.log(`\nTotal users: ${users.length}`);

    // Get recruiter details
    console.log('\n=== RECRUITERS ===');
    const recruiters = await RecruiterProfile.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    recruiters.forEach((recruiter, index) => {
      console.log(`\n--- Recruiter ${index + 1} ---`);
      console.log(`ID: ${recruiter.id}`);
      console.log(`User ID: ${recruiter.userId}`);
      console.log(`Name: ${recruiter.user ? `${recruiter.user.firstName} ${recruiter.user.lastName}` : 'N/A'}`);
      console.log(`Email: ${recruiter.user ? recruiter.user.email : 'N/A'}`);
      console.log(`Company ID: ${recruiter.companyId || 'Not associated with a company'}`);
      console.log(`Title: ${recruiter.title || 'N/A'}`);
      console.log(`Verified: ${recruiter.isVerified ? 'Yes' : 'No'}`);
      console.log(`Active Job Postings: ${recruiter.activeJobPostings}`);
      console.log(`Monthly Limit: ${recruiter.monthlyJobPostingLimit}`);
    });

    console.log(`\nTotal recruiters: ${recruiters.length}`);

    // Get job seeker details
    console.log('\n=== JOB SEEKERS ===');
    const jobSeekers = await JobSeekerProfile.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    jobSeekers.forEach((jobSeeker, index) => {
      console.log(`\n--- Job Seeker ${index + 1} ---`);
      console.log(`ID: ${jobSeeker.id}`);
      console.log(`User ID: ${jobSeeker.userId}`);
      console.log(`Name: ${jobSeeker.user ? `${jobSeeker.user.firstName} ${jobSeeker.user.lastName}` : 'N/A'}`);
      console.log(`Email: ${jobSeeker.user ? jobSeeker.user.email : 'N/A'}`);
      console.log(`Title: ${jobSeeker.title || 'N/A'}`);
      console.log(`Experience: ${jobSeeker.experienceYears || 'N/A'} years`);
    });

    console.log(`\nTotal job seekers: ${jobSeekers.length}`);

    await sequelize.close();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error listing users:', error);
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(1);
  }
}

// Run the function
listUsers(); 