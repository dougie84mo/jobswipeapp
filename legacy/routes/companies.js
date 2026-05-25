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
      check('name', 'Company name is required').not().isEmpty()
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
        website: website || '',
        industry: industry || '',
        size: size || '',
        founded: founded || null,
        headquarters: headquarters || null,
        locations: locations || [],
        description: description || '',
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
        permissionLevel: 'owner' // Full owner rights for the creator
      });

      res.json(company);
    } catch (err) {
      console.error('Create company error:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/companies
// @desc    Get all companies for the current recruiter
// @access  Private (Recruiters only)
router.get('/', [auth, recruiterCheck], async (req, res) => {
  try {
    console.log('=== GET /api/companies DEBUGGING ===');
    console.log('User ID:', req.user.id);
    
    // First check if the recruiter profile exists
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });
    
    if (!recruiterProfile) {
      console.log('No recruiter profile found for user ID:', req.user.id);
      return res.status(404).json({ msg: 'Recruiter profile not found' });
    }
    
    console.log('Recruiter profile ID:', recruiterProfile.id);
    
    // Get companies where the recruiter is the creator
    const ownedCompanies = await Company.findAll({
      where: { createdByRecruiterId: recruiterProfile.id },
      order: [['createdAt', 'DESC']]
    });
    
    // Get companies shared with the recruiter
    const companyRecruiters = await CompanyRecruiter.findAll({
      where: { 
        recruiterId: recruiterProfile.id,
        // Don't include companies where they are already the creator
        companyId: {
          [Op.notIn]: ownedCompanies.map(c => c.id)
        }
      },
      include: [
        {
          model: Company,
          as: 'company'
        }
      ]
    });
    
    // Extract companies from permissions and add permission level
    const sharedCompanies = companyRecruiters
      .filter(cr => cr.company) // Ensure company exists
      .map(cr => {
        const company = cr.company.toJSON();
        return {
          ...company,
          userPermissionLevel: cr.permissionLevel // Use the permissionLevel directly
        };
      });
    
    // Add owner permission level to owned companies
    const ownedCompaniesWithPermission = ownedCompanies.map(company => {
      const companyData = company.toJSON();
      return {
        ...companyData,
        userPermissionLevel: 'owner'
      };
    });
    
    // Combine owned and shared companies
    const allCompanies = [...ownedCompaniesWithPermission, ...sharedCompanies];
    
    console.log(`Found ${allCompanies.length} companies (${ownedCompaniesWithPermission.length} owned, ${sharedCompanies.length} shared)`);
    
    res.json({ companies: allCompanies });
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
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
    console.log('=== PUT /api/companies/:id DEBUGGING ===');
    console.log('Request body:', JSON.stringify(req.body));
    console.log('Company ID:', req.params.id);
    console.log('User ID:', req.user.id);
    
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }

    console.log('Company found:', company.id, company.name);
    console.log('Created by recruiter ID:', company.createdByRecruiterId);

    // Check if recruiter is associated with this company
    const recruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!recruiterProfile) {
      return res.status(403).json({ msg: 'Recruiter profile not found' });
    }

    console.log('Recruiter ID:', recruiterProfile.id);
    
    // Check the Companies table to see if this recruiter is the creator
    const isCreator = company.createdByRecruiterId === recruiterProfile.id;
    console.log('Is creator check:', isCreator);
    
    // Manual verification of companies created by this recruiter
    const createdCompanies = await Company.findAll({
      where: { createdByRecruiterId: recruiterProfile.id }
    });
    console.log('Companies created by this recruiter:', createdCompanies.map(c => c.id));
    
    // Check all CompanyRecruiter records for this company
    const allCompanyRecruiters = await CompanyRecruiter.findAll({
      where: { companyId: company.id }
    });
    console.log('All company recruiters for this company:', 
      allCompanyRecruiters.map(cr => ({
        recruiterId: cr.recruiterId,
        permissionLevel: cr.permissionLevel
      }))
    );
    
    // Check if recruiter has admin access to this company
    const companyRecruiter = await CompanyRecruiter.findOne({
      where: { 
        companyId: company.id,
        recruiterId: recruiterProfile.id,
        permissionLevel: { [Op.in]: ['owner', 'shared-owner'] } // Allow both owner and shared-owner access levels
      }
    });

    if (!companyRecruiter) {
      console.log('Permission check failed. User does not have owner or shared-owner permission.');
      console.log('Checking if any CompanyRecruiter record exists at all with different permissions:');
      
      const anyCompanyRecruiter = await CompanyRecruiter.findOne({
        where: { 
          companyId: company.id,
          recruiterId: recruiterProfile.id
        }
      });
      
      if (anyCompanyRecruiter) {
        console.log('Found CompanyRecruiter record with permission level:', anyCompanyRecruiter.permissionLevel);
      } else {
        console.log('No CompanyRecruiter record found at all for this company and recruiter.');
      }
      
      return res.status(403).json({ msg: 'Not authorized to update this company' });
    }

    console.log('Permission check passed. User has permission level:', companyRecruiter.permissionLevel);

    const {
      name,
      website,
      industry,
      size,
      founded,
      headquarters,
      location, // Handle singular 'location' field
      locations, // Also handle the plural 'locations' field
      description,
      mission,
      culture,
      benefits,
      socialMedia
    } = req.body;

    // Update company fields
    const updateData = {};
    if (name) updateData.name = name;
    updateData.website = website !== undefined ? website : '';
    updateData.industry = industry || '';
    updateData.size = size || '';
    if (founded) updateData.founded = founded;
    if (headquarters) updateData.headquarters = headquarters;
    
    // Handle backward compatibility: Check for singular 'location' field first
    const locationsToUse = locations !== undefined ? locations : location;
    
    // Handle locations array - ensure it's in the right format
    if (locationsToUse !== undefined) {
      // If locations is a string, try to parse it as JSON
      if (typeof locationsToUse === 'string' && locationsToUse.trim()) {
        try {
          updateData.locations = JSON.parse(locationsToUse);
        } catch (e) {
          // If not valid JSON, treat as a single location
          updateData.locations = [locationsToUse];
        }
      } else if (Array.isArray(locationsToUse)) {
        updateData.locations = locationsToUse;
      } else if (locationsToUse === null || locationsToUse === '') {
        updateData.locations = [];
      }
    }
    
    updateData.description = description !== undefined ? description : '';
    if (mission !== undefined) updateData.mission = mission;
    if (culture !== undefined) updateData.culture = culture;
    
    // Handle benefits array - ensure it's in the right format
    if (benefits !== undefined) {
      // If benefits is a string, try to parse it as JSON
      if (typeof benefits === 'string' && benefits.trim()) {
        try {
          updateData.benefits = JSON.parse(benefits);
        } catch (e) {
          // If not valid JSON, treat as a single benefit
          updateData.benefits = [benefits];
        }
      } else if (Array.isArray(benefits)) {
        updateData.benefits = benefits;
      } else if (benefits === null || benefits === '') {
        updateData.benefits = [];
      }
    }
    
    // Handle socialMedia object - ensure it's in the right format
    if (socialMedia !== undefined) {
      // If socialMedia is a string, try to parse it as JSON
      if (typeof socialMedia === 'string' && socialMedia.trim()) {
        try {
          updateData.socialMedia = JSON.parse(socialMedia);
        } catch (e) {
          console.error('Error parsing socialMedia:', e);
          // If invalid JSON, use empty object
          updateData.socialMedia = {};
        }
      } else if (typeof socialMedia === 'object' && socialMedia !== null) {
        updateData.socialMedia = socialMedia;
      } else if (socialMedia === null || socialMedia === '') {
        updateData.socialMedia = {};
      }
    }

    console.log('Update data:', JSON.stringify(updateData));

    try {
      await company.update(updateData);
      res.json(company);
    } catch (updateErr) {
      console.error('Specific update error:', updateErr);
      return res.status(400).json({ 
        msg: 'Failed to update company', 
        error: updateErr.message,
        validationErrors: updateErr.errors ? updateErr.errors.map(e => ({
          field: e.path,
          message: e.message,
          value: e.value
        })) : null
      });
    }
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ 
      msg: 'Server error', 
      error: err.message 
    });
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
        permissionLevel: { [Op.in]: ['owner', 'shared-owner'] } // Only owners and shared-owners can upload logos
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
        permissionLevel: 'owner' // Only owners can request verification
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

// @route   POST api/companies/:id/share
// @desc    Share a company with another recruiter
// @access  Private (Recruiters only)
router.post('/:id/share', [auth, recruiterCheck], async (req, res) => {
  try {
    const { recruiterId, permissionLevel } = req.body;
    
    if (!recruiterId || !permissionLevel) {
      return res.status(400).json({ msg: 'Recruiter ID and permission level are required' });
    }
    
    // Validate permission level
    if (!['owner', 'shared-owner', 'shared'].includes(permissionLevel)) {
      return res.status(400).json({ msg: 'Invalid permission level' });
    }
    
    const company = await Company.findByPk(req.params.id);
    
    if (!company) {
      return res.status(404).json({ msg: 'Company not found' });
    }
    
    // Get current recruiter's profile
    const currentRecruiterProfile = await RecruiterProfile.findOne({
      where: { userId: req.user.id }
    });
    
    if (!currentRecruiterProfile) {
      return res.status(403).json({ msg: 'Recruiter profile not found' });
    }
    
    // Check if current recruiter has permission to share this company
    const currentRecruiterPermission = await CompanyRecruiter.findOne({
      where: { 
        companyId: company.id,
        recruiterId: currentRecruiterProfile.id
      }
    });
    
    if (!currentRecruiterPermission || currentRecruiterPermission.permissionLevel === 'shared') {
      return res.status(403).json({ msg: 'Not authorized to share this company' });
    }
    
    // Check if the target recruiter exists
    const targetRecruiter = await RecruiterProfile.findByPk(recruiterId);
    
    if (!targetRecruiter) {
      return res.status(404).json({ msg: 'Target recruiter not found' });
    }
    
    // Create or update the company-recruiter relationship
    const [permission, created] = await CompanyRecruiter.findOrCreate({
      where: {
        companyId: company.id,
        recruiterId
      },
      defaults: {
        relationTitle: 'Shared Recruiter',
        permissionLevel
      }
    });
    
    if (!created) {
      // Update existing permission
      await permission.update({
        permissionLevel
      });
    }
    
    // Return the permission with recruiter info
    const permissionWithRecruiter = await CompanyRecruiter.findOne({
      where: {
        companyId: company.id,
        recruiterId
      },
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
    
    res.json({ 
      permission: {
        id: permissionWithRecruiter.id,
        companyId: permissionWithRecruiter.companyId,
        recruiterId: permissionWithRecruiter.recruiterId,
        permissionLevel: permissionWithRecruiter.permissionLevel,
        createdAt: permissionWithRecruiter.createdAt,
        updatedAt: permissionWithRecruiter.updatedAt,
        recruiter: permissionWithRecruiter.recruiter ? {
          id: permissionWithRecruiter.recruiter.id,
          firstName: permissionWithRecruiter.recruiter.user.firstName,
          lastName: permissionWithRecruiter.recruiter.user.lastName,
          email: permissionWithRecruiter.recruiter.user.email,
          profilePicture: permissionWithRecruiter.recruiter.user.profilePicture
        } : null
      } 
    });
  } catch (err) {
    console.error('Share company error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router; 