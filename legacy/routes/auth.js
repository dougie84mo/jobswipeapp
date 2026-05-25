const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { User, JobSeekerProfile, RecruiterProfile } = require('../models');
const authController = require('../controllers/authController');

/**
 * @route   POST api/auth/register
 * @desc    Register user
 * @access  Public
 */
router.post(
  '/register',
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('userType', 'User type must be either jobseeker or recruiter').isIn(['jobseeker', 'recruiter'])
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, userType, location, bio } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ where: { email } });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      console.log('=== REGISTER PROCESS ===');
      console.log('Original password:', password);
      
      // Generate salt
      const salt = await bcrypt.genSalt(10);
      console.log('Generated salt:', salt);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log('Hashed password:', hashedPassword);

      // Create user
      user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        userType,
        location: location || '',
        bio: bio || ''
      });

      console.log('User created with ID:', user.id);
      console.log('Stored password hash:', user.password);

      // Create profile based on user type
      if (userType === 'jobseeker') {
        await JobSeekerProfile.create({
          userId: user.id
        });
      } else if (userType === 'recruiter') {
        await RecruiterProfile.create({
          userId: user.id
        });
      }

      // Get user without password
      const userWithoutPassword = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] }
      });

      // Create JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      console.log('JWT payload:', payload);
      console.log('JWT secret:', process.env.JWT_SECRET ? 'Secret exists' : 'Secret missing');

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' },
        (err, token) => {
          if (err) {
            console.error('JWT sign error:', err);
            throw err;
          }
          console.log('Generated token:', token);
          
          // Return both token and user data
          res.json({ 
            token,
            user: {
              id: userWithoutPassword.id,
              email: userWithoutPassword.email,
              firstName: userWithoutPassword.firstName,
              lastName: userWithoutPassword.lastName,
              userType: userWithoutPassword.userType,
              location: userWithoutPassword.location,
              bio: userWithoutPassword.bio,
              profilePicture: userWithoutPassword.profilePicture,
              isActive: userWithoutPassword.isActive,
              createdAt: userWithoutPassword.createdAt,
              updatedAt: userWithoutPassword.updatedAt
            }
          });
        }
      );
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ message: 'Server error', details: err.message });
    }
  }
);

/**
 * @route   POST api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Get user with password for validation
      const userWithPassword = await User.findOne({ 
        where: { email }
      });
      
      if (!userWithPassword) {
        console.log('User not found:', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log('User found:', userWithPassword.email);
      console.log('Stored password hash:', userWithPassword.password);
      console.log('Provided password:', password);

      // Use the model's validatePassword method
      const isMatch = await userWithPassword.validatePassword(password);
      console.log('Password validation result:', isMatch);
      
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Get user without password for response
      const user = await User.findOne({ 
        where: { email },
        attributes: { exclude: ['password'] }
      });

      // Create JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' },
        (err, token) => {
          if (err) throw err;
          
          // Return both token and user data
          res.json({ 
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              userType: user.userType,
              location: user.location,
              bio: user.bio,
              profilePicture: user.profilePicture,
              isActive: user.isActive,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            }
          });
        }
      );
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error', details: err.message });
    }
  }
);

/**
 * @route   GET api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    // Get user data
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: req.user.userType === 'jobseeker' ? JobSeekerProfile : RecruiterProfile,
          as: req.user.userType === 'jobseeker' ? 'jobSeekerProfile' : 'recruiterProfile'
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ msg: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Update user verification status
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    await user.update({ isVerified: true });
    
    res.json({ msg: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(400).json({ msg: 'Invalid or expired token' });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  '/forgot-password',
  [check('email', 'Please include a valid email').isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Create reset token
      const payload = {
        id: user.id,
        email: user.email
      };

      const resetToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });

      // TODO: Send email with reset link
      // This would typically involve an email service integration

      res.json({ msg: 'Password reset email sent' });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post(
  '/reset-password',
  [
    check('token', 'Token is required').not().isEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Update user password
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      
      await user.update({ password });
      
      res.json({ msg: 'Password reset successfully' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(400).json({ msg: 'Invalid or expired token' });
    }
  }
);

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', auth, authController.getCurrentUser);

module.exports = router; 