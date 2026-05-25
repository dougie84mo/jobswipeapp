const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Op, QueryTypes } = require('sequelize');
const { sequelize, Job, Company, RecruiterProfile, User, Swipe, CompanyRecruiter, JobRecruiter } = require('../models');
const auth = require('../middleware/auth');

// Middleware to check if user is a recruiter
const recruiterCheck = (req, res, next) => {
  if (req.user.userType !== 'recruiter') {
    return res.status(403).json({ msg: 'Access denied. Recruiter role required.' });
  }
  next();
};

// @route   POST api/jobs
// @desc    Create a job posting
// @access  Private (Recruiters only)
router.post(
  '/',
  [
    auth,
    recruiterCheck,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('jobType', 'Job type is required').isIn(['full-time', 'part-time', 'contract', 'internship', 'temporary']),
      check('skills', 'Skills must be an array').isArray(),
      check('requirements', 'Requirements must be an array').isArray(),
      check('companyId', 'Company ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      console.log('=== POST /api/jobs DEBUGGING ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Get recruiter profile
      const recruiterProfile = await RecruiterProfile.findOne({
        where: { userId: req.user.id }
      });

      if (!recruiterProfile) {
        return res.status(404).json({ msg: 'Recruiter profile not found' });
      }

      // Check if the company exists and the recruiter has access to it
      const { companyId } = req.body;
      
      const company = await Company.findByPk(companyId);
      if (!company) {
        return res.status(404).json({ msg: 'Company not found' });
      }
      
      // Check if recruiter has access to this company
      const companyRecruiter = await CompanyRecruiter.findOne({
        where: { 
          companyId,
          recruiterId: recruiterProfile.id,
          relationType: { [Op.in]: ['admin', 'shared-admin'] } // Only admins and shared-admins can create jobs
        }
      });
      
      if (!companyRecruiter) {
        return res.status(403).json({ msg: 'Not authorized to create jobs for this company' });
      }

      // Check if recruiter has reached their job posting limit
      const activeJobCount = await Job.count({
        where: {
          recruiterId: recruiterProfile.id,
          status: 'active'
        }
      });

      if (activeJobCount >= recruiterProfile.monthlyJobPostingLimit) {
        return res.status(403).json({
          msg: 'You have reached your monthly job posting limit. Please upgrade your subscription to post more jobs.'
        });
      }

      // Create job posting
      const {
        title, description, responsibilities, requirements, location,
        isRemote, isHybrid, jobType, experienceLevel, educationLevel,
        salaryMin, salaryMax, salaryCurrency, benefits, skills, industry,
        applicationDeadline, applicationUrl
      } = req.body;

      // Format salary for client compatibility
      const salary = (salaryMin || salaryMax) ? 
        `${salaryMin || 0}-${salaryMax || 0} ${salaryCurrency || 'USD'}` : 
        null;

      try {
        // If location is not provided, use company location
        let jobLocation = location;
        if (!jobLocation || jobLocation.trim() === '') {
          if (company.headquarters) {
            jobLocation = company.headquarters;
            console.log('Using company headquarters as location:', jobLocation);
          }
        }

        console.log('Creating job with data:', {
          title,
          companyId,
          responsibilities: responsibilities || null,
          requirements: Array.isArray(requirements) ? requirements : [],
          location: jobLocation || null,
          skills: Array.isArray(skills) ? skills : []
        });

        const newJob = await Job.create({
          title,
          companyId,
          recruiterId: recruiterProfile.id,
          description,
          responsibilities: responsibilities || null,
          requirements: Array.isArray(requirements) ? requirements : [],
          location: jobLocation || null,
          isRemote: isRemote || false,
          isHybrid: isHybrid || false,
          jobType,
          experienceLevel: experienceLevel || null,
          educationLevel: educationLevel || null,
          salaryMin: salaryMin || null,
          salaryMax: salaryMax || null,
          salaryCurrency: salaryCurrency || 'USD',
          benefits: benefits || [],
          skills: Array.isArray(skills) ? skills : [],
          industry: industry || null,
          applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
          applicationUrl: applicationUrl || null,
          status: 'active'
        });

        // Update recruiter's active job count
        await recruiterProfile.update({
          activeJobPostings: activeJobCount + 1
        });

        // Format response to match client expectations
        const formattedJob = {
          ...newJob.toJSON(),
          salary,
          company: {
            id: company.id,
            name: company.name,
            logo: company.logo,
            description: company.description
          },
          isActive: newJob.status === 'active'
        };

        console.log('Job created successfully, sending response');
        res.json(formattedJob);
      } catch (createError) {
        console.error('Job creation error details:', createError);
        return res.status(400).json({ 
          msg: 'Error creating job posting', 
          details: createError.message 
        });
      }
    } catch (err) {
      console.error('Job creation error:', err);
      res.status(500).json({ msg: 'Server error', details: err.message });
    }
  }
);

// @route   GET api/jobs
// @desc    Get all jobs with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('=== GET /api/jobs DEBUGGING ===');
    console.log('Query params:', req.query);
    
    const {
      search, location, jobType, experienceLevel, isRemote,
      salaryMin, salaryMax, industry, skills, page = 1, limit = 10
    } = req.query;

    // Build filter conditions
    const whereConditions = {
      status: 'active'
    };

    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (location) {
      whereConditions.location = { [Op.iLike]: `%${location}%` };
    }

    if (jobType) {
      whereConditions.jobType = jobType;
    }

    if (experienceLevel) {
      whereConditions.experienceLevel = experienceLevel;
    }

    if (isRemote === 'true') {
      whereConditions.isRemote = true;
    }

    if (salaryMin) {
      whereConditions.salaryMin = { [Op.gte]: parseInt(salaryMin) };
    }

    if (salaryMax) {
      whereConditions.salaryMax = { [Op.lte]: parseInt(salaryMax) };
    }

    if (industry) {
      whereConditions.industry = industry;
    }

    if (skills) {
      const skillsArray = skills.split(',');
      whereConditions.skills = { [Op.overlap]: skillsArray };
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get jobs with company info
    const jobs = await Job.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'logo', 'industry', 'size', 'description']
        },
        {
          model: RecruiterProfile,
          as: 'recruiter',
          attributes: ['id', 'title'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'profilePicture']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    console.log(`Found ${jobs.count} jobs`);
    
    // Get user's recruiter profile if they are a recruiter
    let recruiterProfile = null;
    if (req.user.userType === 'recruiter') {
      recruiterProfile = await RecruiterProfile.findOne({
        where: { userId: req.user.id }
      });
    }
    
    // If user is a job seeker, check if they've already swiped on these jobs
    if (req.user.userType === 'jobseeker') {
      const jobIds = jobs.rows.map(job => job.id);
      
      const swipes = await Swipe.findAll({
        where: {
          userId: req.user.id,
          jobId: { [Op.in]: jobIds }
        },
        attributes: ['jobId', 'direction']
      });
      
      const swipeMap = swipes.reduce((acc, swipe) => {
        acc[swipe.jobId] = swipe.direction;
        return acc;
      }, {});
      
      // Add swiped info to jobs
      jobs.rows = jobs.rows.map(job => {
        const jobJSON = job.toJSON();
        return {
          ...jobJSON,
          swiped: swipeMap[job.id] || null,
          // Format salary
          salary: (job.salaryMin || job.salaryMax) ? 
            `${job.salaryMin || 0}-${job.salaryMax || 0} ${job.salaryCurrency || 'USD'}` : 
            null,
          isActive: job.status === 'active'
        };
      });
    } else if (recruiterProfile) {
      // For recruiters, add permission information to each job
      const jobIds = jobs.rows.map(job => job.id);
      
      // Get all permissions for the current recruiter across these jobs
      const jobPermissions = await JobRecruiter.findAll({
        where: {
          jobId: { [Op.in]: jobIds },
          recruiterId: recruiterProfile.id
        },
        attributes: ['jobId', 'permissionLevel']
      });
      
      const permissionMap = jobPermissions.reduce((acc, permission) => {
        acc[permission.jobId] = permission.permissionLevel;
        return acc;
      }, {});
      
      // Add permission and format data for each job
      jobs.rows = jobs.rows.map(job => {
        const jobJSON = job.toJSON();
        const isOwner = job.recruiterId === recruiterProfile.id;
        
        return {
          ...jobJSON,
          userPermissionLevel: isOwner ? 'owner' : (permissionMap[job.id] || 'none'),
          // Format salary
          salary: (job.salaryMin || job.salaryMax) ? 
            `${job.salaryMin || 0}-${job.salaryMax || 0} ${job.salaryCurrency || 'USD'}` : 
            null,
          isActive: job.status === 'active'
        };
      });
    } else {
      // Format job data for regular users
      jobs.rows = jobs.rows.map(job => {
        const jobJSON = job.toJSON();
        return {
          ...jobJSON,
          // Format salary
          salary: (job.salaryMin || job.salaryMax) ? 
            `${job.salaryMin || 0}-${job.salaryMax || 0} ${job.salaryCurrency || 'USD'}` : 
            null,
          isActive: job.status === 'active'
        };
      });
    }
    
    // Calculate total pages
    const totalPages = Math.ceil(jobs.count / limit);
    
    res.json({
      jobs: jobs.rows,
      pagination: {
        total: jobs.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// @route   GET api/jobs/id/:id
// @desc    Get job by ID
// @access  Private
router.get('/id/:id', auth, async (req, res) => {
  try {
    console.log('=== GET /api/jobs/id/:id DEBUGGING ===');
    console.log('Job ID:', req.params.id);
    
    const job = await Job.findByPk(req.params.id, {
      include: [
        {
          model: Company,
          as: 'company'
        },
        {
          model: RecruiterProfile,
          as: 'recruiter',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
            }
          ]
        }
      ]
    });

    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }

    // Format job to match client expectations
    const jobData = job.toJSON();
    
    // Format salary
    const salary = (jobData.salaryMin || jobData.salaryMax) ? 
      `${jobData.salaryMin || 0}-${jobData.salaryMax || 0} ${jobData.salaryCurrency || 'USD'}` : 
      null;
    
    const formattedJob = {
      ...jobData,
      salary,
      isActive: jobData.status === 'active',
      company: jobData.company ? {
        id: jobData.company.id,
        name: jobData.company.name,
        logo: jobData.company.logo,
        description: jobData.company.description
      } : undefined
    };

    // Add permission level information for the current user if they're a recruiter
    let userPermissionLevel = null;
    if (req.user.userType === 'recruiter') {
      const recruiterProfile = await RecruiterProfile.findOne({
        where: { userId: req.user.id }
      });
      
      if (recruiterProfile) {
        // Check if user is the owner of the job
        if (job.recruiterId === recruiterProfile.id) {
          userPermissionLevel = 'owner';
        } else {
          // Check if user has shared access to the job
          const jobPermission = await JobRecruiter.findOne({
            where: {
              jobId: job.id,
              recruiterId: recruiterProfile.id
            }
          });
          
          if (jobPermission) {
            userPermissionLevel = jobPermission.permissionLevel;
          } else {
            userPermissionLevel = 'none';
          }
        }
      }
    }

    // Return formatted job with permission info
    res.json({ 
      job: formattedJob,
      userPermissionLevel
    });
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// @route   PUT api/jobs/id/:id
// @desc    Update a job posting
// @access  Private (Recruiters only)
router.put('/id/:id', [auth, recruiterCheck], async (req, res) => {
  try {
    console.log('=== PUT /api/jobs/id/:id DEBUGGING ===');
    console.log('Job ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const job = await Job.findByPk(req.params.id);
    
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }
    
    // Verify ownership or permission
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });
    
    if (!recruiterProfile) {
      return res.status(404).json({ msg: 'Recruiter profile not found' });
    }

    // Check permission to edit this job
    const hasDirectAccess = job.recruiterId === recruiterProfile.id;
    let hasSharedAccess = false;
    
    if (!hasDirectAccess) {
      const jobPermission = await JobRecruiter.findOne({
        where: {
          jobId: job.id,
          recruiterId: recruiterProfile.id,
          permissionLevel: { [Op.in]: ['owner', 'shared-owner'] }
        }
      });
      
      hasSharedAccess = !!jobPermission;
    }
    
    if (!hasDirectAccess && !hasSharedAccess) {
      return res.status(403).json({ msg: 'Not authorized to update this job' });
    }

    // Get the company for this job
    const company = await Company.findByPk(job.companyId);
    if (!company) {
      return res.status(404).json({ msg: 'Associated company not found' });
    }

    // Update job fields
    const {
      title, description, responsibilities, requirements, location,
      isRemote, isHybrid, jobType, experienceLevel, educationLevel,
      salaryMin, salaryMax, salaryCurrency, benefits, skills, industry,
      applicationDeadline, applicationUrl, status
    } = req.body;

    // Start with the current job data and update only what's provided
    const updateData = {
      title: title !== undefined ? title : job.title,
      description: description !== undefined ? description : job.description,
      responsibilities: responsibilities !== undefined ? responsibilities : job.responsibilities,
      requirements: requirements !== undefined ? (Array.isArray(requirements) ? requirements : job.requirements) : job.requirements,
      location: location !== undefined ? location : job.location,
      isRemote: isRemote !== undefined ? isRemote : job.isRemote,
      isHybrid: isHybrid !== undefined ? isHybrid : job.isHybrid,
      jobType: jobType !== undefined ? jobType : job.jobType,
      experienceLevel: experienceLevel !== undefined ? experienceLevel : job.experienceLevel,
      educationLevel: educationLevel !== undefined ? educationLevel : job.educationLevel,
      salaryMin: salaryMin !== undefined ? salaryMin : job.salaryMin,
      salaryMax: salaryMax !== undefined ? salaryMax : job.salaryMax,
      salaryCurrency: salaryCurrency !== undefined ? salaryCurrency : job.salaryCurrency,
      benefits: benefits !== undefined ? benefits : job.benefits,
      skills: skills !== undefined ? (Array.isArray(skills) ? skills : job.skills) : job.skills,
      industry: industry !== undefined ? industry : job.industry,
      applicationDeadline: applicationDeadline !== undefined ? 
        (applicationDeadline ? new Date(applicationDeadline) : null) : job.applicationDeadline,
      applicationUrl: applicationUrl !== undefined ? applicationUrl : job.applicationUrl,
      status: status !== undefined ? status : job.status
    };

    console.log('Update data prepared:', JSON.stringify(updateData, null, 2));

    try {
      await job.update(updateData);
      console.log('Job updated successfully');

      // If job status changed, update recruiter's active job count
      if (status && status !== job.status) {
        if (status === 'active' && job.status !== 'active') {
          await recruiterProfile.update({
            activeJobPostings: recruiterProfile.activeJobPostings + 1
          });
        } else if (status !== 'active' && job.status === 'active') {
          await recruiterProfile.update({
            activeJobPostings: Math.max(0, recruiterProfile.activeJobPostings - 1)
          });
        }
      }

      // Get the updated job with related data
      const updatedJob = await Job.findByPk(req.params.id, {
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'logo', 'description']
          }
        ]
      });

      // Format salary for client compatibility
      const salary = (updatedJob.salaryMin || updatedJob.salaryMax) ? 
        `${updatedJob.salaryMin || 0}-${updatedJob.salaryMax || 0} ${updatedJob.salaryCurrency || 'USD'}` : 
        null;

      // Format response to match client expectations
      const formattedJob = {
        ...updatedJob.toJSON(),
        salary,
        isActive: updatedJob.status === 'active'
      };

      console.log('Sending response');
      return res.json(formattedJob);
    } catch (updateError) {
      console.error('Job update database error:', updateError);
      return res.status(400).json({ 
        msg: 'Error updating job posting', 
        details: updateError.message 
      });
    }
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// @route   DELETE api/jobs/id/:id
// @desc    Delete a job posting
// @access  Private (Recruiters only)
router.delete('/id/:id', [auth, recruiterCheck], async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }
    
    // Verify ownership
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id },
      include: [
        { 
          model: Company, 
          as: 'company' 
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'profilePicture']
        }
      ]
    });
    
    if (!recruiterProfile) {
      return res.status(404).json({ msg: 'Recruiter profile not found' });
    }

    // Check if the recruiter owns this job
    if (job.recruiterId !== recruiterProfile.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this job' });
    }

    // If job is active, update recruiter's active job count
    if (job.status === 'active') {
      await recruiterProfile.update({
        activeJobPostings: Math.max(0, recruiterProfile.activeJobPostings - 1)
      });
    }

    await job.destroy();

    res.json({ msg: 'Job removed' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/jobs/recruiter/dashboard
// @desc    Get recruiter's job dashboard
// @access  Private (Recruiters only)
router.get('/recruiter/dashboard', [auth, recruiterCheck], async (req, res) => {
  try {
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id },
      include: [
        { 
          model: Company, 
          as: 'company' 
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'profilePicture']
        }
      ]
    });

    if (!recruiterProfile) {
      return res.status(404).json({ msg: 'Recruiter profile not found' });
    }

    // Get recruiter's jobs with stats
    const jobs = await Job.findAll({
      where: { recruiterId: recruiterProfile.id },
      attributes: [
        'id', 'title', 'status', 'createdAt', 'viewCount', 
        'applicationCount', 'matchCount'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get counts by status
    const activeCount = await Job.count({
      where: { 
        recruiterId: recruiterProfile.id,
        status: 'active'
      }
    });

    const pausedCount = await Job.count({
      where: { 
        recruiterId: recruiterProfile.id,
        status: 'paused'
      }
    });

    const filledCount = await Job.count({
      where: { 
        recruiterId: recruiterProfile.id,
        status: 'filled'
      }
    });

    const expiredCount = await Job.count({
      where: { 
        recruiterId: recruiterProfile.id,
        status: 'expired'
      }
    });

    res.json({
      jobs,
      stats: {
        totalJobs: jobs.length,
        activeJobs: activeCount,
        pausedJobs: pausedCount,
        filledJobs: filledCount,
        expiredJobs: expiredCount,
        monthlyLimit: recruiterProfile.monthlyJobPostingLimit,
        remainingPosts: recruiterProfile.monthlyJobPostingLimit - activeCount
      }
    });
  } catch (err) {
    console.error('Get recruiter dashboard error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/jobs/recruiter
// @desc    Get all jobs posted by the current recruiter
// @access  Private (Recruiter only)
router.get('/recruiter', [auth, recruiterCheck], async (req, res) => {
  try {
    console.log('=== GET /api/jobs/recruiter DEBUGGING ===');
    console.log('User ID:', req.user.id);
    console.log('User type:', req.user.userType);
    
    // First check if the recruiter profile exists
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });
    
    console.log('Recruiter profile found:', recruiterProfile ? 'Yes' : 'No');
    
    if (!recruiterProfile) {
      console.log('No recruiter profile found for user ID:', req.user.id);
      return res.status(404).json({ msg: 'Recruiter profile not found' });
    }
    
    console.log('Recruiter profile ID:', recruiterProfile.id);
    
    // Check if there are any jobs for this recruiter
    const jobCount = await Job.count({
      where: { recruiterId: recruiterProfile.id }
    });
    
    console.log('Job count for this recruiter:', jobCount);
    
    // Get all jobs for this recruiter using the ORM approach first
    console.log('Attempting to fetch jobs using ORM...');
    try {
      // Find jobs directly created by the recruiter
      const ownedJobs = await Job.findAll({
        where: { recruiterId: recruiterProfile.id },
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'logo', 'description']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      // Find jobs shared with the recruiter
      const sharedJobPermissions = await JobRecruiter.findAll({
        where: { recruiterId: recruiterProfile.id },
        include: [
          {
            model: Job,
            as: 'job',
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['id', 'name', 'logo', 'description']
              }
            ]
          }
        ]
      });
      
      // Extract jobs from permissions and add permission level
      const sharedJobs = sharedJobPermissions
        .filter(permission => permission.job) // Ensure job exists
        .map(permission => {
          const job = permission.job.toJSON();
          return {
            ...job,
            userPermissionLevel: permission.permissionLevel
          };
        });
      
      // Add owner permission level to owned jobs
      const ownedJobsWithPermission = ownedJobs.map(job => {
        const jobData = job.toJSON();
        return {
          ...jobData,
          userPermissionLevel: 'owner'
        };
      });
      
      // Combine owned and shared jobs
      const allJobs = [...ownedJobsWithPermission, ...sharedJobs];
      
      console.log('ORM query successful, found', allJobs.length, 'jobs');
      
      // Format jobs to match client expectations
      const formattedJobs = allJobs.map(job => {
        // Format salary
        const salary = (job.salaryMin || job.salaryMax) ?
          `${job.salaryMin || 0}-${job.salaryMax || 0} ${job.salaryCurrency || 'USD'}` :
          null;
        
        return {
          ...job,
          salary,
          isActive: job.status === 'active'
        };
      });
      
      console.log('Returning', formattedJobs.length, 'formatted jobs');
      return res.json({ jobs: formattedJobs });
    } catch (ormError) {
      console.error('ORM approach failed:', ormError);
      console.log('Falling back to raw SQL query...');
    }
    
    // If ORM approach fails, try raw SQL
    try {
      console.log('Executing raw SQL query...');
      // First get owned jobs
      const ownedJobs = await sequelize.query(`
        SELECT j.*,
          c.id AS "company.id",
          c.name AS "company.name",
          c.logo AS "company.logo",
          'owner' AS "userPermissionLevel"
        FROM "Jobs" j
        JOIN "RecruiterProfiles" r ON j."recruiterId" = r.id
        JOIN "Companies" c ON j."companyId" = c.id
        WHERE r."userId" = :userId
        ORDER BY j."createdAt" DESC
      `, {
        replacements: { userId: req.user.id },
        type: QueryTypes.SELECT
      });
      
      // Then get shared jobs
      const sharedJobs = await sequelize.query(`
        SELECT j.*,
          c.id AS "company.id",
          c.name AS "company.name",
          c.logo AS "company.logo",
          jr."permissionLevel" AS "userPermissionLevel"
        FROM "Jobs" j
        JOIN "JobRecruiters" jr ON j."id" = jr."jobId"
        JOIN "RecruiterProfiles" r ON jr."recruiterId" = r.id
        JOIN "Companies" c ON j."companyId" = c.id
        WHERE r."userId" = :userId AND j."recruiterId" != r.id
        ORDER BY j."createdAt" DESC
      `, {
        replacements: { userId: req.user.id },
        type: QueryTypes.SELECT
      });
      
      // Combine owned and shared jobs
      const jobs = [...ownedJobs, ...sharedJobs];
      
      console.log('Raw SQL query successful, found', jobs && Array.isArray(jobs) ? jobs.length : 'undefined', 'jobs');
      
      if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
        console.log('No jobs found in raw SQL query or invalid result format');
        return res.json({ jobs: [] });
      }
      
      // Ensure jobs is an array before mapping
      const jobsArray = Array.isArray(jobs) ? jobs : (jobs[0] && Array.isArray(jobs[0]) ? jobs[0] : []);
      console.log('Processing jobs array with length:', jobsArray.length);
      
      // Format jobs to match client expectations
      const formattedJobs = jobsArray.map(job => {
        // Format salary
        const salary = (job.salaryMin || job.salaryMax) ?
          `${job.salaryMin || 0}-${job.salaryMax || 0} ${job.salaryCurrency || 'USD'}` :
          null;
        
        // Parse JSON fields if they're strings
        let skills = [];
        try {
          skills = typeof job.skills === 'string' ? JSON.parse(job.skills) : (job.skills || []);
        } catch (e) {
          console.error('Error parsing skills:', e);
        }
        
        let benefits = [];
        try {
          benefits = typeof job.benefits === 'string' ? JSON.parse(job.benefits) : (job.benefits || []);
        } catch (e) {
          console.error('Error parsing benefits:', e);
        }
        
        let requirements = [];
        try {
          requirements = typeof job.requirements === 'string' ? JSON.parse(job.requirements) : (job.requirements || []);
        } catch (e) {
          console.error('Error parsing requirements:', e);
        }
        
        return {
          ...job,
          skills,
          benefits,
          requirements,
          salary,
          isActive: job.status === 'active',
          userPermissionLevel: job.userPermissionLevel || 'owner', // Ensure userPermissionLevel is set
          company: {
            id: job['company.id'],
            name: job['company.name'],
            logo: job['company.logo']
          }
        };
      });
      
      console.log('Returning', formattedJobs.length, 'formatted jobs from raw SQL');
      return res.json({ jobs: formattedJobs });
    } catch (sqlError) {
      console.error('Raw SQL approach failed:', sqlError);
      console.error('Error details:', sqlError.stack);
      
      // Send a more detailed error response in development
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ 
          msg: 'Failed to fetch jobs', 
          error: sqlError.message,
          stack: sqlError.stack,
          query: 'SELECT Jobs with company info for recruiter'
        });
      } else {
        // Send a simpler error in production
        return res.status(500).json({ 
          msg: 'Failed to fetch jobs. Please try again later or contact support.'
        });
      }
    }
  } catch (err) {
    console.error('Get recruiter jobs error:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// @route   PUT api/jobs/id/:id/share
// @desc    Share a job with another recruiter
// @access  Private (Recruiters only)
router.put('/id/:id/share', [auth, recruiterCheck], async (req, res) => {
  const { recruiterId, permissionLevel } = req.body;
  
  if (!recruiterId) {
    return res.status(400).json({ msg: 'Recruiter ID is required' });
  }
  
  if (!permissionLevel || !['viewer', 'editor', 'shared-owner'].includes(permissionLevel)) {
    return res.status(400).json({ 
      msg: 'Valid permission level is required (viewer, editor, or shared-owner)' 
    });
  }
  
  try {
    console.log('=== PUT /api/jobs/id/:id/share DEBUGGING ===');
    console.log('Job ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Find the job
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }
    
    // Verify the target recruiter exists
    const targetRecruiter = await RecruiterProfile.findByPk(recruiterId);
    if (!targetRecruiter) {
      return res.status(404).json({ msg: 'Target recruiter not found' });
    }
    
    // Get the current user's recruiter profile
    const currentRecruiter = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });
    
    if (!currentRecruiter) {
      return res.status(404).json({ msg: 'Recruiter profile not found' });
    }
    
    // Check if the current user has permission to share the job
    const isOwner = job.recruiterId === currentRecruiter.id;
    
    if (!isOwner) {
      const jobPermission = await JobRecruiter.findOne({
        where: {
          jobId: job.id,
          recruiterId: currentRecruiter.id,
          permissionLevel: { [Op.in]: ['owner', 'shared-owner'] }
        }
      });
      
      if (!jobPermission) {
        return res.status(403).json({ msg: 'Not authorized to share this job' });
      }
    }
    
    // Check if the job is already shared with the target recruiter
    const existingPermission = await JobRecruiter.findOne({
      where: {
        jobId: job.id,
        recruiterId
      }
    });
    
    if (existingPermission) {
      // Update the existing permission
      await existingPermission.update({ permissionLevel });
      console.log('Updated existing job permission');
    } else {
      // Create a new permission
      await JobRecruiter.create({
        jobId: job.id,
        recruiterId,
        permissionLevel
      });
      console.log('Created new job permission');
    }
    
    // Get all recruiters for this job with their permission levels
    const jobRecruiters = await JobRecruiter.findAll({
      where: { jobId: job.id },
      include: [
        {
          model: RecruiterProfile,
          as: 'recruiter',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
            }
          ]
        }
      ]
    });
    
    const formattedPermissions = jobRecruiters.map(permission => ({
      recruiterId: permission.recruiterId,
      permissionLevel: permission.permissionLevel,
      recruiter: {
        id: permission.recruiter.id,
        name: `${permission.recruiter.user.firstName} ${permission.recruiter.user.lastName}`,
        email: permission.recruiter.user.email,
        profilePicture: permission.recruiter.user.profilePicture
      }
    }));
    
    return res.json({
      msg: 'Job shared successfully',
      permissions: formattedPermissions
    });
    
  } catch (err) {
    console.error('Share job error:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// @route   GET api/jobs/id/:id/permissions
// @desc    Get all permissions for a job
// @access  Private (Recruiters only)
router.get('/id/:id/permissions', [auth, recruiterCheck], async (req, res) => {
  try {
    console.log('=== GET /api/jobs/id/:id/permissions DEBUGGING ===');
    console.log('Job ID:', req.params.id);
    
    // Find the job
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }
    
    // Get the current user's recruiter profile
    const currentRecruiter = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });
    
    if (!currentRecruiter) {
      return res.status(404).json({ msg: 'Recruiter profile not found' });
    }
    
    // Check if the current user has permission to view permissions
    const isOwner = job.recruiterId === currentRecruiter.id;
    let canViewPermissions = isOwner;
    
    if (!isOwner) {
      const jobPermission = await JobRecruiter.findOne({
        where: {
          jobId: job.id,
          recruiterId: currentRecruiter.id,
          permissionLevel: { [Op.in]: ['shared-owner', 'editor'] }
        }
      });
      
      canViewPermissions = !!jobPermission;
    }
    
    if (!canViewPermissions) {
      return res.status(403).json({ msg: 'Not authorized to view permissions for this job' });
    }
    
    // Get all recruiters for this job with their permission levels
    const jobRecruiters = await JobRecruiter.findAll({
      where: { jobId: job.id },
      include: [
        {
          model: RecruiterProfile,
          as: 'recruiter',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
            }
          ]
        }
      ]
    });
    
    // Add the original owner if not already included
    const originalOwnerIncluded = jobRecruiters.some(
      permission => permission.recruiterId === job.recruiterId
    );
    
    let formattedPermissions = jobRecruiters.map(permission => ({
      recruiterId: permission.recruiterId,
      permissionLevel: permission.permissionLevel,
      recruiter: {
        id: permission.recruiter.id,
        name: `${permission.recruiter.user.firstName} ${permission.recruiter.user.lastName}`,
        email: permission.recruiter.user.email,
        profilePicture: permission.recruiter.user.profilePicture
      }
    }));
    
    // If the original owner isn't in the JobRecruiter table, add them manually
    if (!originalOwnerIncluded) {
      const ownerRecruiter = await RecruiterProfile.findByPk(job.recruiterId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
          }
        ]
      });
      
      if (ownerRecruiter) {
        formattedPermissions.unshift({
          recruiterId: ownerRecruiter.id,
          permissionLevel: 'owner',
          recruiter: {
            id: ownerRecruiter.id,
            name: `${ownerRecruiter.user.firstName} ${ownerRecruiter.user.lastName}`,
            email: ownerRecruiter.user.email,
            profilePicture: ownerRecruiter.user.profilePicture
          }
        });
      }
    }
    
    // Return the formatted permissions
    return res.json({
      jobId: job.id,
      permissions: formattedPermissions,
      userPermissionLevel: isOwner ? 'owner' : (jobRecruiters.find(p => p.recruiterId === currentRecruiter.id)?.permissionLevel || 'viewer')
    });
    
  } catch (err) {
    console.error('Get job permissions error:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

module.exports = router; 