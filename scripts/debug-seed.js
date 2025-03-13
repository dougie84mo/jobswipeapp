const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sequelize, User, JobSeekerProfile, RecruiterProfile, Company, Job } = require('../models');

// Helper function to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const debugSeed = async () => {
  try {
    // Sync database (force: true will drop tables if they exist)
    console.log('Syncing database...');
    await sequelize.sync({ force: true });
    console.log('Database synced!');

    // Create one user of each type
    console.log('Creating users...');
    
    const jobseekerId = uuidv4();
    const recruiterId = uuidv4();
    
    const users = [
      {
        id: jobseekerId,
        firstName: 'Test',
        lastName: 'Jobseeker',
        email: 'jobseeker@example.com',
        password: await hashPassword('password123'),
        userType: 'jobseeker',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: recruiterId,
        firstName: 'Test',
        lastName: 'Recruiter',
        email: 'recruiter@example.com',
        password: await hashPassword('password123'),
        userType: 'recruiter',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await User.bulkCreate(users);
    
    console.log('Creating profiles...');
    
    const jobseekerProfileId = uuidv4();
    const recruiterProfileId = uuidv4();
    
    // Create jobseeker profile
    await JobSeekerProfile.create({
      id: jobseekerProfileId,
      userId: jobseekerId,
      title: 'Software Developer',
      bio: 'Experienced developer looking for new opportunities',
      skills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
      experience: 5,
      education: 'Bachelor',
      location: 'New York, NY',
      preferredJobTypes: JSON.stringify(['full-time']),
      preferredLocations: JSON.stringify(['New York, NY', 'Remote']),
      preferredSalary: 80000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create recruiter profile
    await RecruiterProfile.create({
      id: recruiterProfileId,
      userId: recruiterId,
      title: 'Talent Acquisition Specialist',
      bio: 'Experienced recruiter specializing in tech',
      monthlyJobPostingLimit: 10,
      activeJobPostings: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Creating company...');
    
    const companyId = uuidv4();
    
    // Create company
    await Company.create({
      id: companyId,
      name: 'Test Company',
      description: 'A great company for tech professionals',
      website: 'https://testcompany.com',
      location: 'New York, NY',
      industry: 'Technology',
      size: '51-200',
      foundedYear: 2010,
      logo: 'https://via.placeholder.com/150?text=TestCompany',
      recruiterId: recruiterProfileId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Creating job...');
    
    // Create job with minimal fields
    await Job.create({
      id: uuidv4(),
      title: 'Software Developer',
      companyId: companyId,
      recruiterId: recruiterProfileId,
      description: 'We are looking for a talented Software Developer to join our team.',
      responsibilities: 'Write clean code, collaborate with team members',
      requirements: JSON.stringify(['3+ years of experience', 'Strong problem-solving skills']),
      location: 'New York, NY',
      isRemote: false,
      isHybrid: true,
      jobType: 'full-time',
      experienceLevel: 'mid',
      educationLevel: 'Bachelor',
      salaryMin: 70000,
      salaryMax: 100000,
      salaryCurrency: 'USD',
      benefits: JSON.stringify(['Health Insurance', 'Remote Work', '401(k)']),
      skills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
      industry: 'Technology',
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Debug seed data created successfully!');
    
    // Print login credentials
    console.log('\n=== TEST LOGIN CREDENTIALS ===');
    console.log('Jobseeker:');
    console.log('Email: jobseeker@example.com');
    console.log('Password: password123');
    console.log('\nRecruiter:');
    console.log('Email: recruiter@example.com');
    console.log('Password: password123');
    console.log('=============================\n');
    
    // Close database connection
    await sequelize.close();
    
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error(error.stack);
  }
};

// Run the debug seed function
debugSeed(); 