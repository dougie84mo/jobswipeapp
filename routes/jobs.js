const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Op, QueryTypes } = require('sequelize');
const { sequelize, Job, Company, RecruiterProfile, User, Swipe, CompanyRecruiter } = require('../models');
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
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/jobs
// @desc    Get all jobs with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
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
          attributes: ['id', 'firstName', 'lastName', 'logo', 'industry', 'size']
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
      
      const swipeMap = {};
      swipes.forEach(swipe => {
        swipeMap[swipe.jobId] = swipe.direction;
      });
      
      // Add swipe info to job objects
      jobs.rows = jobs.rows.map(job => {
        const jobData = job.toJSON();
        jobData.userSwipe = swipeMap[job.id] || null;
        return jobData;
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
    res.status(500).send('Server error');
  }
});

// @route   GET api/jobs/id/:id
// @desc    Get job by ID
// @access  Private
router.get('/id/:id', auth, async (req, res) => {
  try {
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

    res.json({ job: formattedJob });
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

    // Update job fields
    const {
      title, description, responsibilities, requirements, location,
      isRemote, isHybrid, jobType, experienceLevel, educationLevel,
      salaryMin, salaryMax, salaryCurrency, benefits, skills, industry,
      applicationDeadline, applicationUrl, status
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
    if (requirements !== undefined) updateData.requirements = requirements;
    
    // Handle location field
    if (location !== undefined) {
      // If location is empty, use company location
      if (!location || location.trim() === '') {
        const company = await Company.findByPk(recruiterProfile.companyId);
        if (company && company.location) {
          updateData.location = company.location;
          console.log('Using company location for update:', company.location);
        } else {
          updateData.location = null;
        }
      } else {
        updateData.location = location;
      }
    }
    
    if (isRemote !== undefined) updateData.isRemote = isRemote;
    if (isHybrid !== undefined) updateData.isHybrid = isHybrid;
    if (jobType) updateData.jobType = jobType;
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
    if (educationLevel !== undefined) updateData.educationLevel = educationLevel;
    if (salaryMin !== undefined) updateData.salaryMin = salaryMin;
    if (salaryMax !== undefined) updateData.salaryMax = salaryMax;
    if (salaryCurrency) updateData.salaryCurrency = salaryCurrency;
    if (benefits) updateData.benefits = benefits;
    if (skills) updateData.skills = skills;
    if (industry !== undefined) updateData.industry = industry;
    if (applicationDeadline !== undefined) {
      updateData.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null;
    }
    if (applicationUrl !== undefined) updateData.applicationUrl = applicationUrl;
    if (status) updateData.status = status;

    await job.update(updateData);

    // If job status changed to inactive, update recruiter's active job count
    if (status && status !== 'active' && job.status === 'active') {
      await recruiterProfile.update({
        activeJobPostings: Math.max(0, recruiterProfile.activeJobPostings - 1)
      });
    } else if (status && status === 'active' && job.status !== 'active') {
      await recruiterProfile.update({
        activeJobPostings: recruiterProfile.activeJobPostings + 1
      });
    }

    res.json(await Job.findByPk(req.params.id, {
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
              attributes: ['id', 'firstName', 'lastName', 'profilePicture']
            }
          ]
        }
      ]
    }));
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).send('Server error');
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
      const jobs = await Job.findAll({
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
      
      console.log('ORM query successful, found', jobs.length, 'jobs');
      
      // Format jobs to match client expectations
      const formattedJobs = jobs.map(job => {
        const jobData = job.toJSON();
        
        // Format salary
        const salary = (jobData.salaryMin || jobData.salaryMax) ?
          `${jobData.salaryMin || 0}-${jobData.salaryMax || 0} ${jobData.salaryCurrency || 'USD'}` :
          null;
        
        return {
          ...jobData,
          salary,
          isActive: jobData.status === 'active'
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
      const jobs = await sequelize.query(`
        SELECT j.*,
          c.id AS "company.id",
          c.name AS "company.name",
          c.logo AS "company.logo"
        FROM "Jobs" j
        JOIN "RecruiterProfiles" r ON j."recruiterId" = r.id
        JOIN "Companies" c ON j."companyId" = c.id
        WHERE r."userId" = :userId
        ORDER BY j."createdAt" DESC
      `, {
        replacements: { userId: req.user.id },
        type: QueryTypes.SELECT
      });
      
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

module.exports = router; 