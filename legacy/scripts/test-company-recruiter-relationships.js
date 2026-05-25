const { sequelize, User, RecruiterProfile, Company, CompanyRecruiter, Job } = require('../models');

// Debug function to log relationship details
const logRelationshipDetails = (relationship, recruiterName, companyName) => {
  console.log(`\n[DEBUG] Relationship Details:`);
  console.log(`- Recruiter: ${recruiterName}`);
  console.log(`- Company: ${companyName}`);
  console.log(`- Relation Type: ${relationship.relationType}`);
  console.log(`- Relation Title: ${relationship.relationTitle}`);
  console.log(`- Created At: ${relationship.createdAt}`);
};

async function testCompanyRecruiterRelationships() {
  try {
    console.log('=== TESTING COMPANY-RECRUITER RELATIONSHIPS ===');
    
    // 1. Get all recruiters
    const recruiters = await User.findAll({
      where: { userType: 'recruiter' },
      include: [
        {
          model: RecruiterProfile,
          as: 'recruiterProfile'
        }
      ]
    });
    
    console.log(`Found ${recruiters.length} recruiters`);
    
    // 2. For each recruiter, get their companies
    for (const recruiter of recruiters) {
      console.log(`\n--- Recruiter: ${recruiter.firstName} ${recruiter.lastName} (${recruiter.email}) ---`);
      
      if (!recruiter.recruiterId) {
        console.log('No recruiter profile ID found');
        continue;
      }
      
      // Get the recruiter's profile with companies
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
        continue;
      }
      
      // Get companies created by this recruiter
      const createdCompanies = await Company.findAll({
        where: { createdByRecruiterId: recruiterProfile.id }
      });
      
      console.log(`Companies created by this recruiter: ${createdCompanies.length}`);
      createdCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (${company.id})`);
      });
      
      // Get all companies this recruiter has access to
      console.log(`\nCompanies this recruiter has access to: ${recruiterProfile.companies.length}`);
      
      // Group companies by relation type
      const adminCompanies = recruiterProfile.companies.filter(c => c.companyRecruiter.relationType === 'admin');
      const sharedAdminCompanies = recruiterProfile.companies.filter(c => c.companyRecruiter.relationType === 'shared-admin');
      const sharedLimitedCompanies = recruiterProfile.companies.filter(c => c.companyRecruiter.relationType === 'shared-limited');
      
      console.log(`- Admin access: ${adminCompanies.length} companies`);
      adminCompanies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.id})`);
        logRelationshipDetails(
          company.companyRecruiter,
          `${recruiter.firstName} ${recruiter.lastName}`,
          company.name
        );
      });
      
      console.log(`\n- Shared admin access: ${sharedAdminCompanies.length} companies`);
      sharedAdminCompanies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.id})`);
        logRelationshipDetails(
          company.companyRecruiter,
          `${recruiter.firstName} ${recruiter.lastName}`,
          company.name
        );
      });
      
      console.log(`\n- Shared limited access: ${sharedLimitedCompanies.length} companies`);
      sharedLimitedCompanies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.id})`);
        logRelationshipDetails(
          company.companyRecruiter,
          `${recruiter.firstName} ${recruiter.lastName}`,
          company.name
        );
      });
      
      // Get jobs created by this recruiter
      const jobs = await Job.findAll({
        where: { recruiterId: recruiterProfile.id },
        include: [
          {
            model: Company,
            as: 'company'
          }
        ]
      });
      
      console.log(`\nJobs created by this recruiter: ${jobs.length}`);
      
      // Group jobs by company
      const jobsByCompany = {};
      jobs.forEach(job => {
        const companyId = job.companyId;
        if (!jobsByCompany[companyId]) {
          jobsByCompany[companyId] = [];
        }
        jobsByCompany[companyId].push(job);
      });
      
      // Print jobs by company
      Object.keys(jobsByCompany).forEach(companyId => {
        const companyJobs = jobsByCompany[companyId];
        const companyName = companyJobs[0].company ? companyJobs[0].company.name : 'Unknown Company';
        
        console.log(`\n  Company: ${companyName} (${companyId})`);
        console.log(`  Jobs: ${companyJobs.length}`);
        
        companyJobs.forEach((job, index) => {
          console.log(`    ${index + 1}. ${job.title} (${job.id})`);
        });
      });
    }
    
    // 3. For each company, get its recruiters
    console.log('\n\n=== COMPANIES AND THEIR RECRUITERS ===');
    
    const companies = await Company.findAll();
    console.log(`Found ${companies.length} companies`);
    
    for (const company of companies) {
      console.log(`\n--- Company: ${company.name} (${company.id}) ---`);
      
      // Get the creator
      const creator = await RecruiterProfile.findByPk(company.createdByRecruiterId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });
      
      if (creator) {
        console.log(`Created by: ${creator.user.firstName} ${creator.user.lastName} (${creator.user.email})`);
      } else {
        console.log('Creator not found');
      }
      
      // Get all recruiters for this company
      const companyRecruiters = await CompanyRecruiter.findAll({
        where: { companyId: company.id },
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
      
      console.log(`\nRecruiters with access: ${companyRecruiters.length}`);
      
      // Group recruiters by relation type
      const adminRecruiters = companyRecruiters.filter(cr => cr.relationType === 'admin');
      const sharedAdminRecruiters = companyRecruiters.filter(cr => cr.relationType === 'shared-admin');
      const sharedLimitedRecruiters = companyRecruiters.filter(cr => cr.relationType === 'shared-limited');
      
      console.log(`- Admin recruiters: ${adminRecruiters.length}`);
      adminRecruiters.forEach((cr, index) => {
        console.log(`  ${index + 1}. ${cr.recruiter.user.firstName} ${cr.recruiter.user.lastName} (${cr.recruiter.user.email})`);
        console.log(`     Title: ${cr.relationTitle}`);
      });
      
      console.log(`\n- Shared admin recruiters: ${sharedAdminRecruiters.length}`);
      sharedAdminRecruiters.forEach((cr, index) => {
        console.log(`  ${index + 1}. ${cr.recruiter.user.firstName} ${cr.recruiter.user.lastName} (${cr.recruiter.user.email})`);
        console.log(`     Title: ${cr.relationTitle}`);
      });
      
      console.log(`\n- Shared limited recruiters: ${sharedLimitedRecruiters.length}`);
      sharedLimitedRecruiters.forEach((cr, index) => {
        console.log(`  ${index + 1}. ${cr.recruiter.user.firstName} ${cr.recruiter.user.lastName} (${cr.recruiter.user.email})`);
        console.log(`     Title: ${cr.relationTitle}`);
      });
      
      // Get jobs for this company
      const jobs = await Job.findAll({
        where: { companyId: company.id },
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
      
      console.log(`\nJobs for this company: ${jobs.length}`);
      
      // Group jobs by recruiter
      const jobsByRecruiter = {};
      jobs.forEach(job => {
        const recruiterId = job.recruiterId;
        if (!jobsByRecruiter[recruiterId]) {
          jobsByRecruiter[recruiterId] = [];
        }
        jobsByRecruiter[recruiterId].push(job);
      });
      
      // Print jobs by recruiter
      Object.keys(jobsByRecruiter).forEach(recruiterId => {
        const recruiterJobs = jobsByRecruiter[recruiterId];
        const recruiterName = recruiterJobs[0].recruiter && recruiterJobs[0].recruiter.user ? 
          `${recruiterJobs[0].recruiter.user.firstName} ${recruiterJobs[0].recruiter.user.lastName}` : 
          'Unknown Recruiter';
        
        console.log(`\n  Recruiter: ${recruiterName} (${recruiterId})`);
        console.log(`  Jobs: ${recruiterJobs.length}`);
        
        recruiterJobs.forEach((job, index) => {
          console.log(`    ${index + 1}. ${job.title} (${job.id})`);
        });
      });
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error testing company-recruiter relationships:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test function
testCompanyRecruiterRelationships()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 