const { sequelize, User, RecruiterProfile, Company, Job, CompanyRecruiter } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function manualDbUpdate() {
  try {
    console.log('Starting manual database update...');
    
    // 1. Check if we need to create the CompanyRecruiter model
    try {
      await sequelize.getQueryInterface().describeTable('CompanyRecruiters');
      console.log('CompanyRecruiters table already exists');
    } catch (error) {
      console.log('Creating CompanyRecruiters table...');
      await CompanyRecruiter.sync();
      console.log('CompanyRecruiters table created');
    }
    
    // 2. Get all recruiter profiles
    const recruiterProfiles = await RecruiterProfile.findAll({
      include: [
        {
          model: User,
          as: 'user'
        }
      ]
    });
    
    console.log(`Found ${recruiterProfiles.length} recruiter profiles`);
    
    // 3. Process each recruiter profile
    for (const profile of recruiterProfiles) {
      console.log(`\nProcessing recruiter profile: ${profile.id}`);
      
      // Update User with recruiterId if not already set
      if (profile.user && !profile.user.recruiterId) {
        console.log(`Setting recruiterId for user ${profile.user.id}`);
        await profile.user.update({ recruiterId: profile.id });
      }
      
      // Check if the profile has a companyId
      if (profile.companyId) {
        const company = await Company.findByPk(profile.companyId);
        
        if (company) {
          console.log(`Found company: ${company.name} (${company.id})`);
          
          // Set createdByRecruiterId if not already set
          if (!company.createdByRecruiterId) {
            console.log(`Setting createdByRecruiterId for company ${company.id}`);
            await company.update({ createdByRecruiterId: profile.id });
          }
          
          // Check if there's already a relationship in CompanyRecruiters
          const existingRelation = await CompanyRecruiter.findOne({
            where: {
              companyId: company.id,
              recruiterId: profile.id
            }
          });
          
          if (!existingRelation) {
            console.log(`Creating CompanyRecruiter relationship for company ${company.id} and recruiter ${profile.id}`);
            await CompanyRecruiter.create({
              id: uuidv4(),
              companyId: company.id,
              recruiterId: profile.id,
              relationTitle: 'Founder',
              relationType: 'admin'
            });
          } else {
            console.log(`CompanyRecruiter relationship already exists`);
          }
        } else {
          console.log(`Company ${profile.companyId} not found`);
        }
      } else {
        console.log(`Recruiter profile has no companyId`);
      }
    }
    
    // 4. Get all job seeker profiles
    const jobSeekerProfiles = await sequelize.models.JobSeekerProfile.findAll({
      include: [
        {
          model: User,
          as: 'user'
        }
      ]
    });
    
    console.log(`\nFound ${jobSeekerProfiles.length} job seeker profiles`);
    
    // 5. Process each job seeker profile
    for (const profile of jobSeekerProfiles) {
      console.log(`Processing job seeker profile: ${profile.id}`);
      
      // Update User with jobSeekerId if not already set
      if (profile.user && !profile.user.jobSeekerId) {
        console.log(`Setting jobSeekerId for user ${profile.user.id}`);
        await profile.user.update({ jobSeekerId: profile.id });
      }
    }
    
    // 6. Check all jobs to ensure they have the correct companyId
    const jobs = await Job.findAll({
      include: [
        {
          model: RecruiterProfile,
          as: 'recruiter',
          include: [
            {
              model: Company,
              as: 'companies'
            }
          ]
        }
      ]
    });
    
    console.log(`\nFound ${jobs.length} jobs`);
    
    // 7. Process each job
    for (const job of jobs) {
      console.log(`Processing job: ${job.id}`);
      
      // Check if the job's companyId is valid
      const company = await Company.findByPk(job.companyId);
      
      if (!company) {
        console.log(`Job ${job.id} has invalid companyId: ${job.companyId}`);
        
        // Try to find a valid company for this recruiter
        if (job.recruiter && job.recruiter.companies && job.recruiter.companies.length > 0) {
          const validCompany = job.recruiter.companies[0];
          console.log(`Setting companyId to ${validCompany.id} for job ${job.id}`);
          await job.update({ companyId: validCompany.id });
        } else {
          console.log(`No valid company found for job ${job.id}`);
        }
      } else {
        console.log(`Job ${job.id} has valid companyId: ${job.companyId}`);
      }
    }
    
    console.log('\nManual database update completed successfully!');
  } catch (error) {
    console.error('Error during manual database update:', error);
  } finally {
    await sequelize.close();
  }
}

manualDbUpdate()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 