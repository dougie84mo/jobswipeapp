const { sequelize, Company, Job, RecruiterProfile } = require('../models');

async function checkCompanyJobRelationship() {
  try {
    console.log('=== CHECKING COMPANY-JOB RELATIONSHIP ===');
    
    // 1. Check for jobs with invalid companyId
    console.log('\nChecking for jobs with invalid companyId...');
    const jobs = await Job.findAll();
    console.log(`Total jobs: ${jobs.length}`);
    
    let invalidCompanyJobs = 0;
    
    for (const job of jobs) {
      const company = await Company.findByPk(job.companyId);
      if (!company) {
        console.log(`Job ${job.id} has invalid companyId: ${job.companyId}`);
        invalidCompanyJobs++;
      }
    }
    
    if (invalidCompanyJobs === 0) {
      console.log('✓ All jobs have valid companyId');
    } else {
      console.log(`✗ Found ${invalidCompanyJobs} jobs with invalid companyId`);
    }
    
    // 2. Check for jobs with invalid recruiterId
    console.log('\nChecking for jobs with invalid recruiterId...');
    
    let invalidRecruiterJobs = 0;
    
    for (const job of jobs) {
      const recruiter = await RecruiterProfile.findByPk(job.recruiterId);
      if (!recruiter) {
        console.log(`Job ${job.id} has invalid recruiterId: ${job.recruiterId}`);
        invalidRecruiterJobs++;
      }
    }
    
    if (invalidRecruiterJobs === 0) {
      console.log('✓ All jobs have valid recruiterId');
    } else {
      console.log(`✗ Found ${invalidRecruiterJobs} jobs with invalid recruiterId`);
    }
    
    // 3. Check for mismatched company-recruiter relationships
    console.log('\nChecking for mismatched company-recruiter relationships in jobs...');
    
    let mismatchedJobs = 0;
    
    for (const job of jobs) {
      const recruiter = await RecruiterProfile.findByPk(job.recruiterId);
      
      if (recruiter && recruiter.companyId && recruiter.companyId !== job.companyId) {
        console.log(`Job ${job.id} has mismatched company-recruiter relationship:`);
        console.log(`- Job companyId: ${job.companyId}`);
        console.log(`- Recruiter companyId: ${recruiter.companyId}`);
        mismatchedJobs++;
      }
    }
    
    if (mismatchedJobs === 0) {
      console.log('✓ All jobs have matching company-recruiter relationships');
    } else {
      console.log(`✗ Found ${mismatchedJobs} jobs with mismatched company-recruiter relationships`);
    }
    
    // 4. Check for companies without jobs
    console.log('\nChecking for companies without jobs...');
    
    const companies = await Company.findAll();
    console.log(`Total companies: ${companies.length}`);
    
    let companiesWithoutJobs = 0;
    
    for (const company of companies) {
      const jobCount = await Job.count({ where: { companyId: company.id } });
      
      if (jobCount === 0) {
        console.log(`Company ${company.name} (${company.id}) has no jobs`);
        companiesWithoutJobs++;
      }
    }
    
    console.log(`Found ${companiesWithoutJobs} companies without jobs`);
    
    // 5. Check for companies without recruiters
    console.log('\nChecking for companies without recruiters...');
    
    let companiesWithoutRecruiters = 0;
    
    for (const company of companies) {
      const recruiterCount = await RecruiterProfile.count({ where: { companyId: company.id } });
      
      if (recruiterCount === 0) {
        console.log(`Company ${company.name} (${company.id}) has no recruiters`);
        companiesWithoutRecruiters++;
      }
    }
    
    console.log(`Found ${companiesWithoutRecruiters} companies without recruiters`);
    
    console.log('\n=== CHECK COMPLETE ===');
  } catch (error) {
    console.error('Error checking company-job relationship:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the check
checkCompanyJobRelationship()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 