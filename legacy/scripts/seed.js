require('dotenv').config();
const bcrypt = require('bcryptjs');
const { 
  sequelize, 
  User, 
  JobSeekerProfile, 
  RecruiterProfile, 
  Company, 
  Job, 
  Subscription 
} = require('../models');

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    // Create sample companies
    const companies = await Company.bulkCreate([
      {
        name: 'Tech Innovators',
        industry: 'Technology',
        size: '51-200',
        headquarters: 'San Francisco, CA',
        description: 'A leading technology company focused on innovation.',
        website: 'https://techinnovators.example.com',
        founded: 2010
      },
      {
        name: 'Global Finance',
        industry: 'Finance',
        size: '1000+',
        headquarters: 'New York, NY',
        description: 'A global financial services firm.',
        website: 'https://globalfinance.example.com',
        founded: 1985
      }
    ]);
    
    // Create sample users and profiles
    
    // Admin user
    const adminUser = await User.create({
      email: 'admin@jobactual.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      userType: 'recruiter',
      location: 'San Francisco, CA',
      bio: 'System administrator'
    });
    
    const adminProfile = await RecruiterProfile.create({
      userId: adminUser.id,
      companyId: companies[0].id,
      title: 'System Administrator',
      department: 'IT',
      isAdmin: true
    });
    
    // Recruiter user
    const recruiterUser = await User.create({
      email: 'recruiter@jobactual.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Recruiter',
      userType: 'recruiter',
      location: 'New York, NY',
      bio: 'Experienced tech recruiter'
    });
    
    const recruiterProfile = await RecruiterProfile.create({
      userId: recruiterUser.id,
      companyId: companies[1].id,
      title: 'Senior Technical Recruiter',
      department: 'HR'
    });
    
    // Job seeker user
    const jobSeekerUser = await User.create({
      email: 'jobseeker@jobactual.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Applicant',
      userType: 'jobseeker',
      location: 'Chicago, IL',
      bio: 'Software developer looking for new opportunities'
    });
    
    const jobSeekerProfile = await JobSeekerProfile.create({
      userId: jobSeekerUser.id,
      title: 'Full Stack Developer',
      summary: 'Experienced developer with a passion for building web applications',
      experience: 5,
      skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Python', 'SQL']),
      education: JSON.stringify([
        {
          institution: 'University of Illinois',
          degree: 'Bachelor of Science in Computer Science',
          year: 2018
        }
      ])
    });
    
    // Create sample jobs
    const jobs = await Job.bulkCreate([
      {
        title: 'Senior Frontend Developer',
        companyId: companies[0].id,
        recruiterId: adminProfile.id,
        description: 'We are looking for an experienced frontend developer to join our team.',
        responsibilities: 'Develop and maintain web applications, collaborate with the design team.',
        requirements: 'At least 3 years of experience with React, JavaScript, and CSS.',
        location: 'San Francisco, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'senior',
        salaryMin: 120000,
        salaryMax: 150000,
        skills: JSON.stringify(['JavaScript', 'React', 'CSS', 'HTML', 'TypeScript']),
        industry: 'Technology'
      },
      {
        title: 'Backend Developer',
        companyId: companies[1].id,
        recruiterId: recruiterProfile.id,
        description: 'Join our backend team to build scalable services.',
        responsibilities: 'Design and implement APIs, optimize database queries.',
        requirements: 'Experience with Node.js, Express, and SQL databases.',
        location: 'New York, NY',
        isRemote: false,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 100000,
        salaryMax: 130000,
        skills: JSON.stringify(['Node.js', 'Express', 'SQL', 'MongoDB', 'API Design']),
        industry: 'Finance'
      }
    ]);
    
    console.log('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
}

seed(); 