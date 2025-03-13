const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sequelize, User, JobSeekerProfile, RecruiterProfile, Company, Job, Subscription } = require('../models');

// Helper function to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const seedDatabase = async () => {
  try {
    // Sync database (force: true will drop tables if they exist)
    console.log('Syncing database...');
    await sequelize.sync({ force: true });
    console.log('Database synced!');

    // Create users
    console.log('Creating users...');
    
    // Create jobseekers
    const jobseekers = [];
    for (let i = 1; i <= 5; i++) {
      jobseekers.push({
        id: uuidv4(),
        firstName: `Seeker${i}`,
        lastName: 'User',
        email: `jobseeker${i}@example.com`,
        password: await hashPassword('password123'),
        userType: 'jobseeker',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Create recruiters
    const recruiters = [];
    for (let i = 1; i <= 3; i++) {
      recruiters.push({
        id: uuidv4(),
        firstName: `Recruiter${i}`,
        lastName: 'User',
        email: `recruiter${i}@example.com`,
        password: await hashPassword('password123'),
        userType: 'recruiter',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Insert users
    const createdJobseekers = await User.bulkCreate(jobseekers);
    const createdRecruiters = await User.bulkCreate(recruiters);
    
    console.log('Creating profiles...');
    
    // Create jobseeker profiles
    const jobseekerProfiles = [];
    for (const jobseeker of createdJobseekers) {
      jobseekerProfiles.push({
        id: uuidv4(),
        userId: jobseeker.id,
        title: 'Software Developer',
        bio: 'Experienced developer looking for new opportunities',
        skills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
        experience: Math.floor(Math.random() * 10) + 1,
        education: 'Bachelor',
        location: 'New York, NY',
        preferredJobTypes: JSON.stringify(['full-time']),
        preferredLocations: JSON.stringify(['New York, NY', 'Remote']),
        preferredSalary: 80000,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Create recruiter profiles
    const recruiterProfiles = [];
    for (const recruiter of createdRecruiters) {
      recruiterProfiles.push({
        id: uuidv4(),
        userId: recruiter.id,
        title: 'Talent Acquisition Specialist',
        bio: 'Experienced recruiter specializing in tech',
        monthlyJobPostingLimit: 10,
        activeJobPostings: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Insert profiles
    const createdJobseekerProfiles = await JobSeekerProfile.bulkCreate(jobseekerProfiles);
    const createdRecruiterProfiles = await RecruiterProfile.bulkCreate(recruiterProfiles);
    
    console.log('Creating companies...');
    
    // Create companies
    const companies = [];
    for (let i = 0; i < createdRecruiterProfiles.length; i++) {
      const recruiter = createdRecruiterProfiles[i];
      
      // Create 2 companies per recruiter
      for (let j = 1; j <= 2; j++) {
        companies.push({
          id: uuidv4(),
          name: `Company ${i+1}-${j}`,
          description: `A great company for tech professionals`,
          website: `https://company${i+1}-${j}.com`,
          location: 'New York, NY',
          industry: 'Technology',
          size: '51-200',
          foundedYear: 2010,
          logo: `https://via.placeholder.com/150?text=Company${i+1}-${j}`,
          recruiterId: recruiter.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // Insert companies
    const createdCompanies = await Company.bulkCreate(companies);
    
    // Update recruiter profiles with company IDs
    console.log('Updating recruiter profiles with company IDs...');
    // Create a map to track which companies belong to which recruiter
    const recruiterCompaniesMap = {};
    
    for (const company of createdCompanies) {
      // Find the recruiter this company was intended for
      for (let i = 0; i < createdRecruiterProfiles.length; i++) {
        const recruiter = createdRecruiterProfiles[i];
        if (company.name.startsWith(`Company ${i+1}`)) {
          if (!recruiterCompaniesMap[recruiter.id]) {
            recruiterCompaniesMap[recruiter.id] = [];
          }
          recruiterCompaniesMap[recruiter.id].push(company);
          break;
        }
      }
    }
    
    // Update each recruiter with their first company
    for (const recruiterId in recruiterCompaniesMap) {
      const recruiterCompanies = recruiterCompaniesMap[recruiterId];
      if (recruiterCompanies.length > 0) {
        const recruiter = createdRecruiterProfiles.find(r => r.id === recruiterId);
        if (recruiter) {
          await recruiter.update({ companyId: recruiterCompanies[0].id });
        }
      }
    }
    
    console.log('Creating jobs...');
    
    // Create jobs one by one instead of bulk create
    for (const company of createdCompanies) {
      // Find the recruiter profile associated with this company
      let recruiterProfile = null;
      
      // Look through all recruiter profiles to find one that has this company ID
      for (const recruiter of createdRecruiterProfiles) {
        if (await recruiter.reload() && recruiter.companyId === company.id) {
          recruiterProfile = recruiter;
          break;
        }
      }
      
      // If no recruiter found, use the first one (fallback)
      if (!recruiterProfile) {
        recruiterProfile = createdRecruiterProfiles[0];
      }
      
      // Create 2 jobs per company
      for (let j = 1; j <= 2; j++) {
        const jobTitle = j % 2 === 0 ? 'Frontend Developer' : 'Backend Developer';
        
        await Job.create({
          id: uuidv4(),
          title: jobTitle,
          companyId: company.id,
          recruiterId: recruiterProfile.id,
          description: `We are looking for a talented ${jobTitle} to join our team.`,
          responsibilities: 'Write clean code, collaborate with team members',
          requirements: JSON.stringify(['3+ years of experience', 'Strong problem-solving skills']),
          location: company.location,
          isRemote: j % 3 === 0,
          isHybrid: j % 3 === 1,
          jobType: 'full-time',
          experienceLevel: 'mid',
          educationLevel: 'Bachelor',
          salaryMin: 70000,
          salaryMax: 100000,
          salaryCurrency: 'USD',
          benefits: JSON.stringify(['Health Insurance', 'Remote Work', '401(k)']),
          skills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
          industry: company.industry,
          applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    console.log('Creating subscriptions...');
    
    // Create subscriptions for recruiters
    const subscriptions = [];
    for (const recruiter of createdRecruiters) {
      subscriptions.push({
        id: uuidv4(),
        userId: recruiter.id,
        tier: 'premium',
        planType: 'recruiter',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentMethod: 'credit_card',
        amount: 49.99,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Insert subscriptions
    await Subscription.bulkCreate(subscriptions);
    
    console.log('Seed data created successfully!');
    
    // Print login credentials
    console.log('\n=== TEST LOGIN CREDENTIALS ===');
    console.log('Jobseeker:');
    console.log('Email: jobseeker1@example.com');
    console.log('Password: password123');
    console.log('\nRecruiter:');
    console.log('Email: recruiter1@example.com');
    console.log('Password: password123');
    console.log('=============================\n');
    
    // Close database connection
    await sequelize.close();
    
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error(error.stack);
  }
};

// Run the seed function
seedDatabase(); 