const { sequelize, User, RecruiterProfile, JobSeekerProfile, Company, Job, CompanyRecruiter, Swipe, Match, Message } = require('../models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Debug function to log relationship creation
const logRelationship = (recruiterName, companyName, relationType, relationTitle) => {
  console.log(`[DEBUG] Creating relationship: ${recruiterName} -> ${companyName} (${relationType}, ${relationTitle})`);
};

const seedNewSchema = async () => {
  try {
    console.log('Starting database seeding with new schema...');
    
    // Clear existing data in the correct order to respect foreign key constraints
    console.log('Clearing existing data...');
    
    // First, disable foreign key checks
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Delete data in the correct order
    console.log('Deleting Messages...');
    await Message.destroy({ where: {} });
    
    console.log('Deleting Matches...');
    await Match.destroy({ where: {} });
    
    console.log('Deleting Swipes...');
    await Swipe.destroy({ where: {} });
    
    console.log('Deleting Jobs...');
    await Job.destroy({ where: {} });
    
    console.log('Deleting CompanyRecruiters...');
    await CompanyRecruiter.destroy({ where: {} });
    
    console.log('Deleting Companies...');
    await Company.destroy({ where: {} });
    
    console.log('Deleting RecruiterProfiles...');
    await RecruiterProfile.destroy({ where: {} });
    
    console.log('Deleting JobSeekerProfiles...');
    await JobSeekerProfile.destroy({ where: {} });
    
    console.log('Deleting Users...');
    await User.destroy({ where: {} });
    
    // Re-enable foreign key checks
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('Creating users...');
    
    // Create job seeker users
    const jobSeekerUsers = [];
    for (let i = 1; i <= 5; i++) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      const jobSeekerUser = await User.create({
        email: `jobseeker${i}@example.com`,
        password: hashedPassword,
        firstName: `JobSeeker${i}`,
        lastName: 'User',
        userType: 'jobseeker',
        isVerified: true
      });
      
      jobSeekerUsers.push(jobSeekerUser);
    }
    
    // Create recruiter users
    const recruiterUsers = [];
    for (let i = 1; i <= 3; i++) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      const recruiterUser = await User.create({
        email: `recruiter${i}@example.com`,
        password: hashedPassword,
        firstName: `Recruiter${i}`,
        lastName: 'User',
        userType: 'recruiter',
        isVerified: true
      });
      
      recruiterUsers.push(recruiterUser);
    }
    
    console.log('Creating job seeker profiles...');
    
    // Create job seeker profiles
    const jobSeekerProfiles = [];
    for (let i = 0; i < jobSeekerUsers.length; i++) {
      const jobSeekerProfile = await JobSeekerProfile.create({
        userId: jobSeekerUsers[i].id,
        title: `Software Developer ${i + 1}`,
        summary: `Experienced software developer with ${3 + i} years of experience.`,
        experience: 3 + i,
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
        education: [
          {
            institution: 'University of Technology',
            degree: 'Bachelor of Science in Computer Science',
            startDate: '2015-09-01',
            endDate: '2019-06-30',
            description: 'Graduated with honors'
          }
        ],
        workHistory: [
          {
            company: 'Tech Company',
            position: 'Software Developer',
            startDate: '2019-07-01',
            endDate: null,
            description: 'Developing web applications using modern technologies'
          }
        ],
        desiredSalary: 80000 + (i * 10000),
        desiredJobTypes: ['full-time', 'remote'],
        isActivelyLooking: true
      });
      
      // Update user with jobSeekerId
      await jobSeekerUsers[i].update({ jobSeekerId: jobSeekerProfile.id });
      
      jobSeekerProfiles.push(jobSeekerProfile);
    }
    
    console.log('Creating recruiter profiles...');
    
    // Create recruiter profiles
    const recruiterProfiles = [];
    for (let i = 0; i < recruiterUsers.length; i++) {
      const recruiterProfile = await RecruiterProfile.create({
        userId: recruiterUsers[i].id,
        title: `Senior Recruiter ${i + 1}`,
        department: 'Talent Acquisition',
        specialties: ['Software Development', 'Data Science', 'DevOps'],
        isVerified: true,
        monthlyJobPostingLimit: 10,
        activeJobPostings: 0
      });
      
      // Update user with recruiterId
      await recruiterUsers[i].update({ recruiterId: recruiterProfile.id });
      
      recruiterProfiles.push(recruiterProfile);
    }
    
    console.log('Creating companies...');
    
    // Create companies
    const companies = [];
    const companyData = [
      {
        name: 'TechInnovate Solutions',
        industry: 'Technology',
        size: '51-200',
        description: 'Leading technology solutions provider',
        creatorIndex: 0 // Index of the recruiter who created this company
      },
      {
        name: 'Global Finance Partners',
        industry: 'Finance',
        size: '201-500',
        description: 'International financial services company',
        creatorIndex: 1
      },
      {
        name: 'HealthTech Innovations',
        industry: 'Healthcare',
        size: '51-200',
        description: 'Innovative healthcare technology solutions',
        creatorIndex: 2
      },
      {
        name: 'Digital Marketing Experts',
        industry: 'Marketing',
        size: '11-50',
        description: 'Specialized digital marketing agency',
        creatorIndex: 0
      },
      {
        name: 'EcoSustain Solutions',
        industry: 'Environmental',
        size: '11-50',
        description: 'Sustainable environmental solutions provider',
        creatorIndex: 1
      }
    ];
    
    for (let i = 0; i < companyData.length; i++) {
      const { name, industry, size, description, creatorIndex } = companyData[i];
      
      const company = await Company.create({
        name,
        industry,
        size,
        description,
        createdByRecruiterId: recruiterProfiles[creatorIndex].id,
        isVerified: true,
        subscriptionTier: 'basic'
      });
      
      companies.push(company);
    }
    
    console.log('Creating company-recruiter relationships...');
    
    // Create company-recruiter relationships with debugging
    const relationshipData = [
      // Format: [recruiterIndex, companyIndex, relationType, relationTitle]
      [0, 0, 'admin', 'Founder'], // Recruiter1 is admin of TechInnovate
      [0, 3, 'admin', 'Founder'], // Recruiter1 is admin of Digital Marketing
      [1, 1, 'admin', 'Founder'], // Recruiter2 is admin of Global Finance
      [1, 4, 'admin', 'Founder'], // Recruiter2 is admin of EcoSustain
      [2, 2, 'admin', 'Founder'], // Recruiter3 is admin of HealthTech
      [1, 0, 'shared-admin', 'Senior Recruiter'], // Recruiter2 is shared-admin of TechInnovate
      [2, 0, 'shared-limited', 'Junior Recruiter'], // Recruiter3 is shared-limited of TechInnovate
      [0, 1, 'shared-limited', 'Consultant'], // Recruiter1 is shared-limited of Global Finance
      [2, 1, 'shared-admin', 'Department Head'], // Recruiter3 is shared-admin of Global Finance
      [0, 2, 'shared-admin', 'Team Lead'], // Recruiter1 is shared-admin of HealthTech
    ];
    
    for (const [recruiterIndex, companyIndex, relationType, relationTitle] of relationshipData) {
      const recruiter = recruiterProfiles[recruiterIndex];
      const company = companies[companyIndex];
      
      // Debug log
      logRelationship(
        `${recruiterUsers[recruiterIndex].firstName} ${recruiterUsers[recruiterIndex].lastName}`,
        company.name,
        relationType,
        relationTitle
      );
      
      await CompanyRecruiter.create({
        id: uuidv4(),
        companyId: company.id,
        recruiterId: recruiter.id,
        relationType,
        relationTitle
      });
    }
    
    console.log('Creating jobs...');
    
    // Create jobs
    const jobData = [
      // Format: [title, companyIndex, recruiterIndex, jobType, skills]
      ['Senior Software Engineer', 0, 0, 'full-time', ['JavaScript', 'React', 'Node.js']],
      ['Data Scientist', 0, 0, 'full-time', ['Python', 'Machine Learning', 'SQL']],
      ['DevOps Engineer', 0, 0, 'full-time', ['AWS', 'Docker', 'Kubernetes']],
      ['Product Manager', 0, 1, 'full-time', ['Agile', 'Product Development', 'User Research']],
      ['UX Designer', 0, 1, 'full-time', ['UI/UX', 'Figma', 'User Testing']],
      
      ['Financial Analyst', 1, 1, 'full-time', ['Financial Modeling', 'Excel', 'SQL']],
      ['Risk Manager', 1, 1, 'full-time', ['Risk Assessment', 'Compliance', 'Financial Analysis']],
      ['Investment Advisor', 1, 2, 'full-time', ['Portfolio Management', 'Financial Planning', 'Client Relations']],
      ['Compliance Officer', 1, 2, 'full-time', ['Regulatory Compliance', 'Risk Management', 'Auditing']],
      
      ['Healthcare Data Analyst', 2, 2, 'full-time', ['Healthcare Analytics', 'Python', 'SQL']],
      ['Medical Software Developer', 2, 2, 'full-time', ['Java', 'Healthcare Systems', 'HIPAA']],
      ['Biomedical Engineer', 2, 0, 'full-time', ['Medical Devices', 'Engineering', 'Research']],
      ['Clinical Systems Specialist', 2, 0, 'full-time', ['Healthcare IT', 'Clinical Workflows', 'EHR Systems']],
      
      ['Digital Marketing Specialist', 3, 0, 'full-time', ['SEO', 'SEM', 'Social Media Marketing']],
      ['Content Strategist', 3, 0, 'full-time', ['Content Creation', 'SEO', 'Marketing Strategy']],
      
      ['Environmental Scientist', 4, 1, 'full-time', ['Environmental Assessment', 'Data Analysis', 'Regulatory Compliance']],
      ['Sustainability Consultant', 4, 1, 'full-time', ['Sustainability', 'Environmental Management', 'Consulting']]
    ];
    
    for (const [title, companyIndex, recruiterIndex, jobType, skills] of jobData) {
      await Job.create({
        title,
        companyId: companies[companyIndex].id,
        recruiterId: recruiterProfiles[recruiterIndex].id,
        description: `We are looking for a skilled ${title} to join our team.`,
        responsibilities: `As a ${title}, you will be responsible for various tasks related to your field.`,
        requirements: ['Bachelor\'s degree', '3+ years of experience', 'Strong communication skills'],
        location: 'Remote',
        isRemote: true,
        jobType,
        experienceLevel: 'mid',
        skills,
        status: 'active'
      });
    }
    
    console.log('Seed data created successfully!');
    
    // Print summary
    console.log('\nSeed Data Summary:');
    console.log(`- ${jobSeekerUsers.length} Job Seekers`);
    console.log(`- ${recruiterUsers.length} Recruiters`);
    console.log(`- ${companies.length} Companies`);
    console.log(`- ${relationshipData.length} Company-Recruiter Relationships`);
    console.log(`- ${jobData.length} Jobs`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Run the seed function
seedNewSchema()
  .then(() => {
    console.log('Database seeding completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }); 