const { v4: uuidv4 } = require('uuid');
const { sequelize, User, RecruiterProfile, Company, Job } = require('../models');

const addMoreData = async () => {
  try {
    console.log('Adding more data to the database...');
    
    // Find the recruiter user
    const recruiter = await User.findOne({
      where: { email: 'recruiter1@example.com' },
      include: [{
        model: RecruiterProfile,
        as: 'recruiterProfile'
      }]
    });
    
    if (!recruiter || !recruiter.recruiterProfile) {
      console.error('Recruiter user or profile not found');
      return;
    }
    
    const recruiterProfileId = recruiter.recruiterProfile.id;
    
    // Add more companies for the recruiter
    const newCompanies = [
      {
        id: uuidv4(),
        name: 'TechInnovate Solutions',
        description: 'A cutting-edge technology company focused on innovative solutions for enterprise clients',
        website: 'https://techinnovate.example.com',
        location: 'San Francisco, CA',
        industry: 'Technology',
        size: '201-500',
        foundedYear: 2015,
        logo: 'https://via.placeholder.com/150?text=TechInnovate',
        recruiterId: recruiterProfileId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Global Finance Partners',
        description: 'A leading financial services firm providing investment and advisory services',
        website: 'https://globalfinance.example.com',
        location: 'New York, NY',
        industry: 'Finance',
        size: '501-1000',
        foundedYear: 2008,
        logo: 'https://via.placeholder.com/150?text=GlobalFinance',
        recruiterId: recruiterProfileId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'HealthTech Innovations',
        description: 'Revolutionizing healthcare through technology and data-driven solutions',
        website: 'https://healthtech.example.com',
        location: 'Boston, MA',
        industry: 'Healthcare',
        size: '101-200',
        foundedYear: 2017,
        logo: 'https://via.placeholder.com/150?text=HealthTech',
        recruiterId: recruiterProfileId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert companies
    console.log('Creating additional companies...');
    const createdCompanies = await Company.bulkCreate(newCompanies);
    
    // Update recruiter profile with the first new company if they don't have one
    if (!recruiter.recruiterProfile.companyId) {
      await recruiter.recruiterProfile.update({ companyId: createdCompanies[0].id });
    }
    
    // Create jobs for each company
    console.log('Creating additional jobs...');
    
    // Job templates with different roles
    const jobTemplates = [
      {
        title: 'Senior Software Engineer',
        description: 'We are looking for an experienced Senior Software Engineer to lead development of our core products.',
        responsibilities: 'Lead development teams, architect solutions, mentor junior developers, and ensure code quality.',
        requirements: JSON.stringify(['7+ years of experience', 'Strong leadership skills', 'Expert in at least one programming language']),
        jobType: 'full-time',
        experienceLevel: 'senior',
        educationLevel: 'Bachelor',
        salaryMin: 120000,
        salaryMax: 160000,
        skills: JSON.stringify(['JavaScript', 'Python', 'AWS', 'System Design']),
        isRemote: true,
        isHybrid: false
      },
      {
        title: 'Product Manager',
        description: 'Join our product team to drive the strategy and execution of our innovative products.',
        responsibilities: 'Define product vision, work with stakeholders, prioritize features, and lead product launches.',
        requirements: JSON.stringify(['5+ years of product management experience', 'Strong analytical skills', 'Excellent communication']),
        jobType: 'full-time',
        experienceLevel: 'mid',
        educationLevel: 'Bachelor',
        salaryMin: 110000,
        salaryMax: 140000,
        skills: JSON.stringify(['Product Strategy', 'User Research', 'Agile Methodologies', 'Data Analysis']),
        isRemote: false,
        isHybrid: true
      },
      {
        title: 'UX/UI Designer',
        description: 'Create beautiful, intuitive user experiences for our digital products.',
        responsibilities: 'Design user interfaces, create prototypes, conduct user research, and collaborate with developers.',
        requirements: JSON.stringify(['3+ years of UX/UI design experience', 'Portfolio of work', 'Proficiency in design tools']),
        jobType: 'full-time',
        experienceLevel: 'mid',
        educationLevel: 'Bachelor',
        salaryMin: 90000,
        salaryMax: 120000,
        skills: JSON.stringify(['Figma', 'User Research', 'Wireframing', 'Prototyping']),
        isRemote: true,
        isHybrid: false
      },
      {
        title: 'Data Scientist',
        description: 'Help us extract insights from data and build predictive models to drive business decisions.',
        responsibilities: 'Analyze data, build models, create visualizations, and present findings to stakeholders.',
        requirements: JSON.stringify(['Masters or PhD in a quantitative field', 'Experience with machine learning', 'Strong programming skills']),
        jobType: 'full-time',
        experienceLevel: 'mid',
        educationLevel: 'Master',
        salaryMin: 115000,
        salaryMax: 150000,
        skills: JSON.stringify(['Python', 'Machine Learning', 'SQL', 'Data Visualization']),
        isRemote: false,
        isHybrid: true
      },
      {
        title: 'DevOps Engineer',
        description: 'Build and maintain our infrastructure and deployment pipelines.',
        responsibilities: 'Manage cloud infrastructure, automate deployments, monitor systems, and ensure reliability.',
        requirements: JSON.stringify(['4+ years of DevOps experience', 'Strong knowledge of cloud platforms', 'Scripting skills']),
        jobType: 'full-time',
        experienceLevel: 'mid',
        educationLevel: 'Bachelor',
        salaryMin: 100000,
        salaryMax: 140000,
        skills: JSON.stringify(['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform']),
        isRemote: true,
        isHybrid: false
      }
    ];
    
    // Create jobs for each company
    for (const company of createdCompanies) {
      // Create 3-5 jobs per company (random selection from templates)
      const numJobs = Math.floor(Math.random() * 3) + 3; // 3-5 jobs
      
      for (let i = 0; i < numJobs; i++) {
        // Select a random job template
        const template = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
        
        await Job.create({
          id: uuidv4(),
          title: template.title,
          companyId: company.id,
          recruiterId: recruiterProfileId,
          description: template.description,
          responsibilities: template.responsibilities,
          requirements: template.requirements,
          location: company.location,
          isRemote: template.isRemote,
          isHybrid: template.isHybrid,
          jobType: template.jobType,
          experienceLevel: template.experienceLevel,
          educationLevel: template.educationLevel,
          salaryMin: template.salaryMin,
          salaryMax: template.salaryMax,
          salaryCurrency: 'USD',
          benefits: JSON.stringify(['Health Insurance', 'Remote Work', '401(k)', 'Professional Development']),
          skills: template.skills,
          industry: company.industry,
          applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    console.log('Additional data created successfully!');
    console.log(`Added ${createdCompanies.length} new companies and multiple jobs for recruiter1@example.com`);
    
    // Close database connection
    await sequelize.close();
    
  } catch (error) {
    console.error('Error adding more data:', error);
    console.error(error.stack);
  }
};

// Run the function
addMoreData(); 