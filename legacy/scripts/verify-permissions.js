'use strict';

require('dotenv').config();
const db = require('../models');

async function verifyPermissions() {
  try {
    console.log('Verifying permission data...');
    
    // 1. Check JobRecruiter data
    const jobPermissions = await db.JobRecruiter.findAll({
      include: [
        { model: db.Job, as: 'job' },
        { model: db.RecruiterProfile, as: 'recruiter', include: [{ model: db.User, as: 'user' }] }
      ]
    });
    
    console.log(`Found ${jobPermissions.length} job permission records`);
    
    // Display a sample of the permissions
    if (jobPermissions.length > 0) {
      const samplePermission = jobPermissions[0];
      console.log('Sample Job Permission:');
      console.log({
        id: samplePermission.id,
        jobId: samplePermission.jobId,
        recruiterId: samplePermission.recruiterId,
        permissionLevel: samplePermission.permissionLevel,
        createdAt: samplePermission.createdAt,
        updatedAt: samplePermission.updatedAt
      });
    }
    
    // 2. Check CompanyRecruiter data
    const companyPermissions = await db.CompanyRecruiter.findAll({
      include: [
        { model: db.Company, as: 'company' },
        { model: db.RecruiterProfile, as: 'recruiter', include: [{ model: db.User, as: 'user' }] }
      ]
    });
    
    console.log(`Found ${companyPermissions.length} company permission records`);
    
    // Display a sample of the permissions
    if (companyPermissions.length > 0) {
      const samplePermission = companyPermissions[0];
      console.log('Sample Company Permission:');
      console.log({
        id: samplePermission.id,
        companyId: samplePermission.companyId,
        recruiterId: samplePermission.recruiterId,
        permissionLevel: samplePermission.permissionLevel,
        relationTitle: samplePermission.relationTitle,
        createdAt: samplePermission.createdAt,
        updatedAt: samplePermission.updatedAt
      });
    }
    
    console.log('Verification complete');
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    process.exit(0);
  }
}

verifyPermissions(); 