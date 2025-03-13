const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { User, JobSeekerProfile, RecruiterProfile, Company } = require('../models');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/profiles';
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

// @route   GET api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    let profile;
    
    if (req.user.userType === 'jobseeker') {
      profile = await JobSeekerProfile.findOne({
        where: { userId: req.user.id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: { exclude: ['password'] }
          }
        ]
      });
    } else if (req.user.userType === 'recruiter') {
      profile = await RecruiterProfile.findOne({
        where: { userId: req.user.id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: { exclude: ['password'] }
          },
          {
            model: Company,
            as: 'company'
          }
        ]
      });
    }

    if (!profile) {
      return res.status(404).json({ msg: 'Profile not found' });
    }

    res.json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    // Update user basic info
    const { firstName, lastName, location, bio, phoneNumber } = req.body;
    
    const userUpdateData = {};
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;
    if (location) userUpdateData.location = location;
    if (bio) userUpdateData.bio = bio;
    if (phoneNumber) userUpdateData.phoneNumber = phoneNumber;
    
    if (Object.keys(userUpdateData).length > 0) {
      await User.update(userUpdateData, { where: { id: req.user.id } });
    }
    
    // Update profile based on user type
    if (req.user.userType === 'jobseeker') {
      const {
        title, summary, experience, education, workHistory, skills,
        certifications, languages, resumeUrl, portfolioUrl, linkedinUrl,
        githubUrl, desiredSalary, desiredJobTypes, desiredLocations,
        desiredIndustries, isRemoteOnly, isOpenToRelocation, isActivelyLooking,
        visibilitySettings
      } = req.body;
      
      const profileUpdateData = {};
      if (title) profileUpdateData.title = title;
      if (summary) profileUpdateData.summary = summary;
      if (experience) profileUpdateData.experience = experience;
      if (education) profileUpdateData.education = education;
      if (workHistory) profileUpdateData.workHistory = workHistory;
      if (skills) profileUpdateData.skills = skills;
      if (certifications) profileUpdateData.certifications = certifications;
      if (languages) profileUpdateData.languages = languages;
      if (resumeUrl) profileUpdateData.resumeUrl = resumeUrl;
      if (portfolioUrl) profileUpdateData.portfolioUrl = portfolioUrl;
      if (linkedinUrl) profileUpdateData.linkedinUrl = linkedinUrl;
      if (githubUrl) profileUpdateData.githubUrl = githubUrl;
      if (desiredSalary) profileUpdateData.desiredSalary = desiredSalary;
      if (desiredJobTypes) profileUpdateData.desiredJobTypes = desiredJobTypes;
      if (desiredLocations) profileUpdateData.desiredLocations = desiredLocations;
      if (desiredIndustries) profileUpdateData.desiredIndustries = desiredIndustries;
      if (isRemoteOnly !== undefined) profileUpdateData.isRemoteOnly = isRemoteOnly;
      if (isOpenToRelocation !== undefined) profileUpdateData.isOpenToRelocation = isOpenToRelocation;
      if (isActivelyLooking !== undefined) profileUpdateData.isActivelyLooking = isActivelyLooking;
      if (visibilitySettings) profileUpdateData.visibilitySettings = visibilitySettings;
      
      if (Object.keys(profileUpdateData).length > 0) {
        await JobSeekerProfile.update(profileUpdateData, { where: { userId: req.user.id } });
      }
    } else if (req.user.userType === 'recruiter') {
      const {
        title, department, hiringGoals, specialties, linkedinUrl
      } = req.body;
      
      const profileUpdateData = {};
      if (title) profileUpdateData.title = title;
      if (department) profileUpdateData.department = department;
      if (hiringGoals) profileUpdateData.hiringGoals = hiringGoals;
      if (specialties) profileUpdateData.specialties = specialties;
      if (linkedinUrl) profileUpdateData.linkedinUrl = linkedinUrl;
      
      if (Object.keys(profileUpdateData).length > 0) {
        await RecruiterProfile.update(profileUpdateData, { where: { userId: req.user.id } });
      }
    }
    
    // Return updated profile
    let updatedProfile;
    
    if (req.user.userType === 'jobseeker') {
      updatedProfile = await JobSeekerProfile.findOne({
        where: { userId: req.user.id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: { exclude: ['password'] }
          }
        ]
      });
    } else if (req.user.userType === 'recruiter') {
      updatedProfile = await RecruiterProfile.findOne({
        where: { userId: req.user.id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: { exclude: ['password'] }
          },
          {
            model: Company,
            as: 'company'
          }
        ]
      });
    }
    
    res.json(updatedProfile);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/users/profile/picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile/picture', [auth, upload.single('profilePicture')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }
    
    // Update user profile picture
    const profilePicture = `/uploads/profiles/${req.file.filename}`;
    
    await User.update(
      { profilePicture },
      { where: { id: req.user.id } }
    );
    
    res.json({ profilePicture });
  } catch (err) {
    console.error('Upload profile picture error:', err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/password
// @desc    Update user password
// @access  Private
router.put(
  '/password',
  [
    auth,
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    try {
      // Get user
      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      
      // Check if current password matches
      const isMatch = await user.validatePassword(currentPassword);
      
      if (!isMatch) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }
      
      // Update password
      await user.update({ password: newPassword });
      
      res.json({ msg: 'Password updated successfully' });
    } catch (err) {
      console.error('Update password error:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if requesting user is a recruiter or the user themselves
    if (req.user.userType !== 'recruiter' && req.user.id !== user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this profile' });
    }
    
    let profile;
    
    if (user.userType === 'jobseeker') {
      profile = await JobSeekerProfile.findOne({
        where: { userId: user.id }
      });
      
      // Check visibility settings if the requester is a recruiter
      if (req.user.userType === 'recruiter' && req.user.id !== user.id) {
        if (profile.visibilitySettings && !profile.visibilitySettings.showProfile) {
          return res.status(403).json({ msg: 'This profile is private' });
        }
        
        // Hide contact information if not visible
        if (profile.visibilitySettings && !profile.visibilitySettings.showContact) {
          user.email = null;
          user.phoneNumber = null;
        }
        
        // Hide salary information if not visible
        if (profile.visibilitySettings && !profile.visibilitySettings.showSalary) {
          profile.desiredSalary = null;
        }
      }
    } else if (user.userType === 'recruiter') {
      profile = await RecruiterProfile.findOne({
        where: { userId: user.id },
        include: [
          {
            model: Company,
            as: 'company'
          }
        ]
      });
    }
    
    res.json({
      user,
      profile
    });
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
