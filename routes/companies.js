const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Company, RecruiterProfile, User, Job, CompanyRecruiter } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/companies';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Middleware to check if user is a recruiter
const recruiterCheck = (req, res, next) => {
  if (req.user.userType !== 'recruiter') {
    return res.status(403).json({ msg: 'Access denied. Recruiter role required.' });
  }
  next();
};

// @route   POST api/companies
// @desc    Create a company
// @access  Private (Recruiters only)
router.post(
  '/',
  [
    auth,
    recruiterCheck,
    [
      check('name', 'Company name is required').not().isEmpty(),
      check('industry', 'Industry is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      website,
      industry,
      size,
      founded,
      headquarters,
      locations,
      description,
      mission,
      culture,
      benefits,
      socialMedia
    } = req.body;

    try {
      // Get recruiter profile
      const recruiterProfile = await RecruiterProfile.findOne({
        where: { userId: req.user.id }
      });

      let profileToUse = recruiterProfile;

      // Check if recruiter profile exists
      if (!recruiterProfile) {
        // Create a recruiter profile if it doesn't exist
        console.log(`Creating new recruiter profile for user ${req.user.id}`);
        profileToUse = await RecruiterProfile.create({
          userId: req.user.id,
          title: 'Recruiter', // Default title
          isVerified: false,
          activeJobPostings: 0,
          monthlyJobPostingLimit: 5
        });
        
        // Update the user with the new recruiterId
        await User.update(
          { recruiterId: profileToUse.id },
          { where: { id: req.user.id } }
        );
        
        console.log(`Created new recruiter profile with ID: ${profileToUse.id}`);
      }

      // Create company with the createdByRecruiterId field
      const company = await Company.create({
        name,
        createdByRecruiterId: profileToUse.id, // Set the creator
        website: website || null,
        industry,
        size: size || null,
        founded: founded || null,
        headquarters: headquarters || null,
        locations: locations || [],
        description: description || null,
        mission: mission || null,
        culture: culture || null,
        benefits: benefits || [],
        socialMedia: socialMedia || {},
        isVerified: false,
        subscriptionTier: 'free'
      });

      // Create the relationship in the CompanyRecruiters table
      await CompanyRecruiter.create({
        companyId: company.id,
        recruiterId: profileToUse.id,
        relationTitle: 'Founder', // Special title for the creator
        relationType: 'admin' // Full admin rights for the creator
      });

      res.json(company);
    } catch (err) {
      console.error('Create company error:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/companies
// @desc    Get all companies (with pagination and filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Check if this is a recruiter requesting their own companies
    if (req.headers['x-auth-token']) {
      try {
        const decoded = require('jsonwebtoken').verify(
          req.headers['x-auth-token'],
          process.env.JWT_SECRET || 'jobactualsecret'
        );
        
        if (decoded.user && decoded.user.id) {
          const user = await User.findByPk(decoded.user.id);
          
          if (user && user.userType === 'recruiter') {
            // Get recruiter profile
            const recruiterProfile = await RecruiterProfile.findOne({
              where: { userId: user.id }
            });
            
            if (recruiterProfile) {
              // Get the recruiter's companies using the CompanyRecruiter junction table
              const companyRecruiters = await CompanyRecruiter.findAll({
                where: { recruiterId: recruiterProfile.id },
                include: [
                  {
                    model: Company,
                    as: 'company'
                  }
                ]
              });
              
              if (companyRecruiters && companyRecruiters.length > 0) {
                // Extract the companies from the relationships
                const companies = companyRecruiters.map(cr => cr.company);
                return res.json({ companies });
              }
            }
            
            // If no companies found, return empty array
            return res.json({ companies: [] });
          }
        }
      } catch (err) {
        console.error('Auth token verification error:', err);
        // Continue with public companies query
      }
    }
    
    // Original public companies query
    const { page = 1, limit = 20, industry, size, search } = req.query;
    const offset = (page - 1) * limit;

    // Build query conditions
    const whereConditions = {};
    
    if (industry) {
      whereConditions.industry = industry;
    }
    
    if (size) {
      whereConditions.size = size;
    }
    
    if (search) {
      whereConditions.name = { [Op.iLike]: `%${search}%` };
    }

    // Get companies with pagination
    const companies = await Company.findAndCountAll({
      where: whereConditions,
      attributes: ['id', 'name', 'logo', 'industry', 'size', 'headquarters', 'isVerified'],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    // Calculate total pages
    const totalPages = Math.ceil(companies.count / limit);
    
    res.json({
      companies: companies.rows,
      pagination: {
        total: companies.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/companies/:id
// @desc    Get company by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [
        {
          model: Job,
          as: 'jobs',
          where: { status: 'active' },
          required: false,
          attributes: ['id', 'title', 'location', 'jobType', 'isRemote', 'createdAt']
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    res.json(company);
  } catch (err) {
    console.error('Get company by ID error:', err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/companies/:id
// @desc    Update company
// @access  Private (Recruiters only)
router.put('/:id', [auth, recruiterCheck], async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    // Check if recruiter is associated with this company
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!recruiterProfile) {
      return res.status(403).json({ msg: 'Recruiter profile not found' });
    }

    // Check if recruiter has admin access to this company
    const companyRecruiter = await CompanyRecruiter.findOne({
      where: { 
        companyId: company.id,
        recruiterId: recruiterProfile.id,
        relationType: 'admin' // Only admins can update company details
      }
    });

    if (!companyRecruiter) {
      return res.status(403).json({ msg: 'Not authorized to update this company' });
    }

    const {
      name,
      website,
      industry,
      size,
      founded,
      headquarters,
      locations,
      description,
      mission,
      culture,
      benefits,
      socialMedia
    } = req.body;

    // Update company fields
    const updateData = {};
    if (name) updateData.name = name;
    if (website !== undefined) updateData.website = website;
    if (industry) updateData.industry = industry;
    if (size) updateData.size = size;
    if (founded) updateData.founded = founded;
    if (headquarters) updateData.headquarters = headquarters;
    if (locations) updateData.locations = locations;
    if (description !== undefined) updateData.description = description;
    if (mission !== undefined) updateData.mission = mission;
    if (culture !== undefined) updateData.culture = culture;
    if (benefits) updateData.benefits = benefits;
    if (socialMedia) updateData.socialMedia = socialMedia;

    await company.update(updateData);

    res.json(company);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/companies/:id/logo
// @desc    Upload company logo
// @access  Private (Recruiters only)
router.post('/:id/logo', [auth, recruiterCheck, upload.single('logo')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    // Check if recruiter is associated with this company
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!recruiterProfile) {
      return res.status(403).json({ msg: 'Recruiter profile not found' });
    }

    // Check if recruiter has admin or shared-admin access to this company
    const companyRecruiter = await CompanyRecruiter.findOne({
      where: { 
        companyId: company.id,
        recruiterId: recruiterProfile.id,
        relationType: { [Op.in]: ['admin', 'shared-admin'] } // Admins and shared-admins can upload logos
      }
    });

    if (!companyRecruiter) {
      return res.status(403).json({ msg: 'Not authorized to update this company' });
    }

    // Update company logo
    const logo = `/uploads/companies/${req.file.filename}`;
    
    await company.update({ logo });
    
    res.json({ logo });
  } catch (err) {
    console.error('Upload company logo error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/companies/:id/recruiters
// @desc    Get recruiters for a company
// @access  Public
router.get('/:id/recruiters', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    const recruiters = await RecruiterProfile.findAll({
      where: { companyId: req.params.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture']
        }
      ]
    });

    res.json(recruiters);
  } catch (err) {
    console.error('Get company recruiters error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/companies/:id/jobs
// @desc    Get jobs for a company
// @access  Public
router.get('/:id/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    // Get jobs with pagination
    const jobs = await Job.findAndCountAll({
      where: {
        companyId: req.params.id,
        status
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

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
    console.error('Get company jobs error:', err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/companies/:id/verify
// @desc    Request company verification
// @access  Private (Recruiters only)
router.post('/:id/verify', [auth, recruiterCheck], async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    // Check if recruiter is associated with this company
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!recruiterProfile) {
      return res.status(403).json({ msg: 'Recruiter profile not found' });
    }

    // Check if recruiter has admin access to this company
    const companyRecruiter = await CompanyRecruiter.findOne({
      where: { 
        companyId: company.id,
        recruiterId: recruiterProfile.id,
        relationType: 'admin' // Only admins can request verification
      }
    });

    if (!companyRecruiter) {
      return res.status(403).json({ msg: 'Not authorized to verify this company' });
    }

    // In a real application, this would trigger a verification process
    // For now, just mark as pending verification
    await company.update({
      verificationStatus: 'pending'
    });

    res.json({ msg: 'Verification request submitted' });
  } catch (err) {
    console.error('Company verification request error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router; 