'use strict';

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const bcrypt = require('bcryptjs');

async function seedPermissions() {
  try {
    console.log('Starting permission seeding process');

    // 1. Get all recruiters
    const recruiters = await db.RecruiterProfile.findAll({
      include: [{ model: db.User, as: 'user' }]
    });

    if (recruiters.length === 0) {
      console.log('No recruiters found, creating test data first...');
      await createTestData();
      return;
    }

    console.log(`Found ${recruiters.length} recruiters`);

    // 2. Get all companies
    const companies = await db.Company.findAll();
    console.log(`Found ${companies.length} companies`);

    // 3. Get all jobs
    const jobs = await db.Job.findAll();
    console.log(`Found ${jobs.length} jobs`);

    // 4. Update the existing company-recruiter relationships
    for (const company of companies) {
      // Find the creator of the company
      const creatorId = company.createdByRecruiterId;
      
      // Check if a relationship already exists
      let ownerRelation = await db.CompanyRecruiter.findOne({
        where: {
          companyId: company.id,
          recruiterId: creatorId
        }
      });

      if (ownerRelation) {
        // Update existing relation to use new permission level terminology
        await ownerRelation.update({
          permissionLevel: 'owner'
        });
        console.log(`Updated company owner permission for company ${company.id}`);
      } else {
        // Create new owner relation
        await db.CompanyRecruiter.create({
          id: uuidv4(),
          companyId: company.id,
          recruiterId: creatorId,
          permissionLevel: 'owner',
          relationTitle: 'Owner'
        });
        console.log(`Created company owner permission for company ${company.id}`);
      }

      // Add some shared permissions for demonstration (to the first available other recruiter)
      const otherRecruiters = recruiters.filter(r => r.id !== creatorId).slice(0, 2);
      
      if (otherRecruiters.length > 0) {
        // Add a shared-owner for the first other recruiter
        await db.CompanyRecruiter.findOrCreate({
          where: {
            companyId: company.id,
            recruiterId: otherRecruiters[0].id
          },
          defaults: {
            id: uuidv4(),
            permissionLevel: 'shared-owner',
            relationTitle: 'Shared Owner'
          }
        });
        console.log(`Created/updated shared-owner permission for company ${company.id}`);
        
        // If there's a second other recruiter, add a shared permission
        if (otherRecruiters.length > 1) {
          await db.CompanyRecruiter.findOrCreate({
            where: {
              companyId: company.id,
              recruiterId: otherRecruiters[1].id
            },
            defaults: {
              id: uuidv4(),
              permissionLevel: 'shared',
              relationTitle: 'Shared'
            }
          });
          console.log(`Created/updated shared permission for company ${company.id}`);
        }
      }
    }

    // 5. Update the job-recruiter relationships
    for (const job of jobs) {
      // The job creator is the owner
      const creatorId = job.recruiterId;
      
      await db.JobRecruiter.findOrCreate({
        where: {
          jobId: job.id,
          recruiterId: creatorId
        },
        defaults: {
          id: uuidv4(),
          permissionLevel: 'owner'
        }
      });
      console.log(`Created/updated job owner permission for job ${job.id}`);

      // Find some other recruiters for shared permissions
      const otherRecruiters = recruiters.filter(r => r.id !== creatorId).slice(0, 2);
      
      if (otherRecruiters.length > 0) {
        // Add a shared-owner for the first other recruiter
        await db.JobRecruiter.findOrCreate({
          where: {
            jobId: job.id,
            recruiterId: otherRecruiters[0].id
          },
          defaults: {
            id: uuidv4(),
            permissionLevel: 'shared-owner'
          }
        });
        console.log(`Created/updated shared-owner permission for job ${job.id}`);
        
        // If there's a second other recruiter, add a shared permission
        if (otherRecruiters.length > 1) {
          await db.JobRecruiter.findOrCreate({
            where: {
              jobId: job.id,
              recruiterId: otherRecruiters[1].id
            },
            defaults: {
              id: uuidv4(),
              permissionLevel: 'shared'
            }
          });
          console.log(`Created/updated shared permission for job ${job.id}`);
        }
      }
    }

    console.log('Permission seeding completed successfully');
  } catch (error) {
    console.error('Permission seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

// Helper function to create test data if needed
async function createTestData() {
  try {
    console.log('Creating test users, recruiters, companies, and jobs...');
    
    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUsers = [
      {
        id: uuidv4(),
        email: 'recruiter1@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        userType: 'recruiter',
        isActive: true,
        isVerified: true
      },
      {
        id: uuidv4(),
        email: 'recruiter2@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        userType: 'recruiter',
        isActive: true,
        isVerified: true
      },
      {
        id: uuidv4(),
        email: 'recruiter3@example.com',
        password: hashedPassword,
        firstName: 'Robert',
        lastName: 'Johnson',
        userType: 'recruiter',
        isActive: true,
        isVerified: true
      }
    ];
    
    const createdUsers = await Promise.all(
      testUsers.map(user => db.User.create(user))
    );
    
    // Create recruiter profiles
    const recruiterProfiles = createdUsers.map(user => ({
      id: uuidv4(),
      userId: user.id,
      title: `Senior Recruiter`,
      department: 'Talent Acquisition',
      specialties: JSON.stringify(['Tech', 'Engineering', 'Marketing']),
      isVerified: true
    }));
    
    const createdRecruiters = await Promise.all(
      recruiterProfiles.map(profile => db.RecruiterProfile.create(profile))
    );
    
    // Create a test company
    const company = await db.Company.create({
      id: uuidv4(),
      name: 'Test Company Inc.',
      description: 'A test company for our permission system',
      website: 'https://testcompany.example.com',
      industry: 'Technology',
      size: '51-200 employees',
      createdByRecruiterId: createdRecruiters[0].id
    });
    
    // Create a test job
    const job = await db.Job.create({
      id: uuidv4(),
      title: 'Software Engineer',
      description: 'A test job position for our permission system',
      companyId: company.id,
      recruiterId: createdRecruiters[0].id,
      location: 'Remote, US',
      jobType: 'full-time',
      isRemote: true,
      skills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
      requirements: JSON.stringify(['3+ years of experience', 'Bachelor\'s degree', 'Strong communication skills']),
      salaryMin: 90000,
      salaryMax: 120000,
      salaryCurrency: 'USD',
      salaryType: 'yearly'
    });
    
    console.log('Test data created successfully');
    
    // Now run the permission seeding again
    await seedPermissions();
    
  } catch (error) {
    console.error('Test data creation failed:', error);
    process.exit(1);
  }
}

seedPermissions(); 