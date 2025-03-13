const { User, RecruiterProfile, Company, Job } = require('../models');

async function debugRecruiterProfile() {
  try {
    console.log('=== DEBUGGING RECRUITER PROFILE AND JOBS ===');
    
    // Find a recruiter user
    const recruiter = await User.findOne({
      where: { userType: 'recruiter' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'userType']
    });
    
    if (!recruiter) {
      console.error('No recruiter user found in the database');
      return;
    }
    
    console.log('Found recruiter user:');
    console.log(`- ID: ${recruiter.id}`);
    console.log(`- Email: ${recruiter.email}`);
    console.log(`- Name: ${recruiter.firstName} ${recruiter.lastName}`);
    
    // Check if the recruiter has a profile
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: recruiter.id }
    });
    
    if (!recruiterProfile) {
      console.error('No recruiter profile found for this user');
      console.log('Creating a recruiter profile...');
      
      // Create a recruiter profile
      const newProfile = await RecruiterProfile.create({
        userId: recruiter.id,
        title: 'Recruiter',
        monthlyJobPostingLimit: 10,
        activeJobPostings: 0
      });
      
      console.log('Created recruiter profile with ID:', newProfile.id);
    } else {
      console.log('Found recruiter profile:');
      console.log(`- ID: ${recruiterProfile.id}`);
      console.log(`- Company ID: ${recruiterProfile.companyId || 'None'}`);
      console.log(`- Job posting limit: ${recruiterProfile.monthlyJobPostingLimit}`);
      console.log(`- Active job postings: ${recruiterProfile.activeJobPostings}`);
    }
    
    // Check the Company model structure
    console.log('\nChecking Company model structure...');
    const companyAttributes = Object.keys(Company.rawAttributes);
    console.log('Company attributes:', companyAttributes);
    
    // Check if the recruiter has a company through the companyId in the recruiter profile
    let company = null;
    if (recruiterProfile && recruiterProfile.companyId) {
      company = await Company.findByPk(recruiterProfile.companyId);
      
      if (company) {
        console.log('\nFound company through recruiter profile:');
        console.log(`- ID: ${company.id}`);
        console.log(`- Name: ${company.name}`);
        console.log(`- Industry: ${company.industry}`);
        console.log(`- Size: ${company.size}`);
      } else {
        console.log('\nNo company found with ID:', recruiterProfile.companyId);
      }
    } else {
      console.log('\nRecruiter profile has no associated company ID');
    }
    
    // If no company is found, assign one from the list
    if (!company && recruiterProfile) {
      console.log('\nAssigning a company to the recruiter profile...');
      
      // Get the first company from the list
      const firstCompany = await Company.findOne();
      
      if (firstCompany) {
        console.log(`Assigning company "${firstCompany.name}" (${firstCompany.id}) to recruiter profile`);
        await recruiterProfile.update({ companyId: firstCompany.id });
        company = firstCompany;
      } else {
        console.log('No companies found in the database');
      }
    }
    
    // Check if the recruiter has any jobs
    console.log('\nChecking for jobs...');
    if (!recruiterProfile) {
      console.log('Cannot check for jobs without a recruiter profile');
      return;
    }
    
    const jobs = await Job.findAll({
      where: { recruiterId: recruiterProfile.id }
    });
    
    if (jobs.length === 0) {
      console.log('No jobs found for this recruiter');
      
      if (company) {
        console.log('Creating a test job...');
        
        // Create a job
        const newJob = await Job.create({
          title: 'Software Developer',
          description: 'We are looking for a skilled software developer to join our team.',
          location: 'Remote',
          companyId: company.id,
          recruiterId: recruiterProfile.id,
          jobType: 'full-time',
          skills: ['JavaScript', 'Node.js', 'React'],
          requirements: ['3+ years of experience', 'Bachelor\'s degree'],
          status: 'active'
        });
        
        console.log('Created job with ID:', newJob.id);
        
        // Update recruiter profile's active job count
        await recruiterProfile.update({
          activeJobPostings: (recruiterProfile.activeJobPostings || 0) + 1
        });
        console.log('Updated recruiter profile\'s active job count');
      } else {
        console.log('Cannot create a job without a company');
      }
    } else {
      console.log(`Found ${jobs.length} jobs for this recruiter:`);
      jobs.forEach((job, index) => {
        console.log(`Job ${index + 1}:`);
        console.log(`- ID: ${job.id}`);
        console.log(`- Title: ${job.title}`);
        console.log(`- Status: ${job.status || 'active'}`);
        console.log(`- Company ID: ${job.companyId}`);
        console.log(`- Recruiter ID: ${job.recruiterId}`);
      });
    }
    
    console.log('\nDebugging complete!');
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

debugRecruiterProfile(); 