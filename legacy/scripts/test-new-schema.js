const { sequelize, User, RecruiterProfile, Company, Job, CompanyRecruiter } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function testNewSchema() {
  try {
    console.log('=== TESTING NEW DATABASE SCHEMA ===');
    
    // 1. Find a recruiter user
    const recruiter = await User.findOne({
      where: { userType: 'recruiter' },
      include: [
        {
          model: RecruiterProfile,
          as: 'recruiterProfile'
        }
      ]
    });
    
    if (!recruiter) {
      console.log('No recruiter user found');
      return;
    }
    
    console.log(`Found recruiter: ${recruiter.firstName} ${recruiter.lastName} (${recruiter.id})`);
    console.log(`Recruiter profile ID: ${recruiter.recruiterId}`);
    
    // 2. Get the recruiter's companies
    const recruiterProfile = await RecruiterProfile.findByPk(recruiter.recruiterId, {
      include: [
        {
          model: Company,
          as: 'companies',
          through: {
            model: CompanyRecruiter,
            as: 'companyRecruiter'
          }
        }
      ]
    });
    
    if (!recruiterProfile) {
      console.log('Recruiter profile not found');
      return;
    }
    
    console.log(`\nRecruiter's companies:`);
    if (recruiterProfile.companies && recruiterProfile.companies.length > 0) {
      recruiterProfile.companies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (${company.id})`);
        console.log(`   Relation type: ${company.companyRecruiter.relationType}`);
        console.log(`   Relation title: ${company.companyRecruiter.relationTitle}`);
      });
    } else {
      console.log('No companies found for this recruiter');
      
      // Create a test company
      console.log('\nCreating a test company...');
      const newCompany = await Company.create({
        name: 'Test Company',
        createdByRecruiterId: recruiterProfile.id,
        industry: 'Technology',
        size: '1-10',
        isVerified: false,
        subscriptionTier: 'free'
      });
      
      console.log(`Created company: ${newCompany.name} (${newCompany.id})`);
      
      // Create the relationship
      await CompanyRecruiter.create({
        id: uuidv4(),
        companyId: newCompany.id,
        recruiterId: recruiterProfile.id,
        relationTitle: 'Founder',
        relationType: 'admin'
      });
      
      console.log('Created company-recruiter relationship');
    }
    
    // 3. Get the recruiter's jobs
    const jobs = await Job.findAll({
      where: { recruiterId: recruiterProfile.id },
      include: [
        {
          model: Company,
          as: 'company'
        }
      ]
    });
    
    console.log(`\nRecruiter's jobs:`);
    if (jobs.length > 0) {
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.title} (${job.id})`);
        console.log(`   Company: ${job.company ? job.company.name : 'Unknown'}`);
        console.log(`   Status: ${job.status}`);
      });
    } else {
      console.log('No jobs found for this recruiter');
    }
    
    // 4. Test creating a new company and job
    console.log('\nTesting company and job creation...');
    
    // Create a new company
    const testCompany = await Company.create({
      name: 'New Test Company',
      createdByRecruiterId: recruiterProfile.id,
      industry: 'Finance',
      size: '11-50',
      isVerified: false,
      subscriptionTier: 'free'
    });
    
    console.log(`Created new company: ${testCompany.name} (${testCompany.id})`);
    
    // Create the relationship
    await CompanyRecruiter.create({
      id: uuidv4(),
      companyId: testCompany.id,
      recruiterId: recruiterProfile.id,
      relationTitle: 'Founder',
      relationType: 'admin'
    });
    
    console.log('Created company-recruiter relationship');
    
    // Create a new job
    const testJob = await Job.create({
      title: 'Test Job',
      companyId: testCompany.id,
      recruiterId: recruiterProfile.id,
      description: 'This is a test job created to test the new schema',
      jobType: 'full-time',
      status: 'active',
      skills: ['JavaScript', 'Node.js', 'React'],
      requirements: ['3+ years of experience', 'Bachelor\'s degree']
    });
    
    console.log(`Created new job: ${testJob.title} (${testJob.id})`);
    
    // 5. Test querying a company's recruiters
    const companyRecruiters = await CompanyRecruiter.findAll({
      where: { companyId: testCompany.id },
      include: [
        {
          model: RecruiterProfile,
          as: 'recruiter',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        }
      ]
    });
    
    console.log(`\nRecruiters for company ${testCompany.name}:`);
    if (companyRecruiters.length > 0) {
      companyRecruiters.forEach((cr, index) => {
        console.log(`${index + 1}. ${cr.recruiter.user.firstName} ${cr.recruiter.user.lastName} (${cr.recruiter.user.email})`);
        console.log(`   Relation type: ${cr.relationType}`);
        console.log(`   Relation title: ${cr.relationTitle}`);
      });
    } else {
      console.log('No recruiters found for this company');
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error testing new schema:', error);
  } finally {
    await sequelize.close();
  }
}

testNewSchema()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 