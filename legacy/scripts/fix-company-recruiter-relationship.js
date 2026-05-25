const { User, RecruiterProfile, Company, Job } = require('../models');

async function fixCompanyRecruiterRelationship() {
  try {
    console.log('=== FIXING COMPANY-RECRUITER RELATIONSHIP ===');
    
    // 1. Find all recruiter profiles
    const recruiterProfiles = await RecruiterProfile.findAll();
    console.log(`Found ${recruiterProfiles.length} recruiter profiles`);
    
    // 2. Check each recruiter profile's company relationship
    for (const profile of recruiterProfiles) {
      console.log(`\nChecking recruiter profile: ${profile.id}`);
      
      // If the profile already has a companyId, verify it exists
      if (profile.companyId) {
        const company = await Company.findByPk(profile.companyId);
        if (company) {
          console.log(`✓ Profile has valid company: ${company.name} (${company.id})`);
          
          // Check if jobs have the correct companyId
          const jobs = await Job.findAll({
            where: { recruiterId: profile.id }
          });
          
          if (jobs.length > 0) {
            console.log(`Found ${jobs.length} jobs for this recruiter`);
            
            // Check if any jobs have incorrect companyId
            const incorrectJobs = jobs.filter(job => job.companyId !== profile.companyId);
            
            if (incorrectJobs.length > 0) {
              console.log(`Found ${incorrectJobs.length} jobs with incorrect companyId`);
              
              // Fix the jobs
              for (const job of incorrectJobs) {
                console.log(`Updating job ${job.id} companyId from ${job.companyId} to ${profile.companyId}`);
                await job.update({ companyId: profile.companyId });
              }
              
              console.log(`✓ Fixed ${incorrectJobs.length} jobs`);
            } else {
              console.log(`✓ All jobs have correct companyId`);
            }
          }
        } else {
          console.log(`✗ Profile has invalid companyId: ${profile.companyId}`);
          
          // Find a company to assign to this profile
          const anyCompany = await Company.findOne();
          
          if (anyCompany) {
            console.log(`Assigning company ${anyCompany.name} (${anyCompany.id}) to profile`);
            await profile.update({ companyId: anyCompany.id });
            
            // Update jobs to use this companyId
            const jobs = await Job.findAll({
              where: { recruiterId: profile.id }
            });
            
            if (jobs.length > 0) {
              console.log(`Updating ${jobs.length} jobs to use companyId: ${anyCompany.id}`);
              
              for (const job of jobs) {
                await job.update({ companyId: anyCompany.id });
              }
              
              console.log(`✓ Updated ${jobs.length} jobs`);
            }
          } else {
            console.log(`✗ No companies found to assign`);
          }
        }
      } else {
        console.log(`✗ Profile has no companyId`);
        
        // Find a company to assign to this profile
        const anyCompany = await Company.findOne();
        
        if (anyCompany) {
          console.log(`Assigning company ${anyCompany.name} (${anyCompany.id}) to profile`);
          await profile.update({ companyId: anyCompany.id });
          
          // Update jobs to use this companyId
          const jobs = await Job.findAll({
            where: { recruiterId: profile.id }
          });
          
          if (jobs.length > 0) {
            console.log(`Updating ${jobs.length} jobs to use companyId: ${anyCompany.id}`);
            
            for (const job of jobs) {
              await job.update({ companyId: anyCompany.id });
            }
            
            console.log(`✓ Updated ${jobs.length} jobs`);
          }
        } else {
          console.log(`✗ No companies found to assign`);
        }
      }
    }
    
    console.log('\n=== CHECKING FOR COMPANIES WITHOUT RECRUITERS ===');
    
    // 3. Find companies that don't have any recruiters
    const companies = await Company.findAll();
    
    for (const company of companies) {
      const recruiters = await RecruiterProfile.findAll({
        where: { companyId: company.id }
      });
      
      if (recruiters.length === 0) {
        console.log(`Company ${company.name} (${company.id}) has no recruiters`);
        
        // Find a recruiter to assign to this company
        const recruiter = await RecruiterProfile.findOne({
          where: { companyId: null }
        });
        
        if (recruiter) {
          console.log(`Assigning recruiter ${recruiter.id} to company`);
          await recruiter.update({ companyId: company.id });
          console.log(`✓ Assigned recruiter to company`);
        } else {
          console.log(`✗ No unassigned recruiters found`);
        }
      }
    }
    
    console.log('\n=== FIX COMPLETE ===');
  } catch (error) {
    console.error('Error fixing company-recruiter relationship:', error);
  }
}

// Run the fix
fixCompanyRecruiterRelationship()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 