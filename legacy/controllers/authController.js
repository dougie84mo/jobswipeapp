const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, PasswordReset } = require('../models');
const { Op } = require('sequelize');
const config = require('../config/config');
const EmailService = require('../services/EmailService');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      userType: user.userType
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    // Generate token
    const token = generateToken(user);

    // Update last active timestamp
    await user.update({ lastActive: new Date() });

    // Return user data and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register user
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, userType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userType,
      isActive: true
    });

    // Generate token
    const token = generateToken(user);

    // Send welcome email
    try {
      // Ensure email service is ready
      await EmailService.initPromise;
      
      await EmailService.sendWelcomeEmail(user.email, user.firstName);
      console.log(`Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with registration even if email fails
    }

    // Return user data and token
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    console.log('=== FORGOT PASSWORD PROCESS ===');
    const { email } = req.body;
    console.log('Requested email for password reset:', email);

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found with email:', email);
      // Don't reveal that the user doesn't exist for security reasons
      return res.status(200).json({ msg: 'Password reset email sent' });
    }

    console.log('User found:', user.id, user.email);

    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated reset token:', resetToken);

    // Set token expiration (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    console.log('Token expires at:', expiresAt);

    try {
      // Save token to database
      console.log('Attempting to create password reset record...');
      const passwordReset = await PasswordReset.create({
        userId: user.id,
        token: resetToken,
        expiresAt,
        isUsed: false
      });
      console.log('Password reset record created:', passwordReset.id);
    } catch (dbError) {
      console.error('Error creating password reset record:', dbError);
      return res.status(500).json({ msg: 'Failed to process password reset request' });
    }

    // Send password reset email
    try {
      // Ensure email service is ready
      console.log('Waiting for email service to be ready...');
      await EmailService.initPromise;
      console.log('Email service is ready');

      await EmailService.sendPasswordResetEmail(user.email, resetToken);
      console.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      return res.status(500).json({ msg: 'Failed to send password reset email. Please try again later.' });
    }

    // Return success message
    console.log('Password reset process completed successfully');
    res.status(200).json({ msg: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    console.log('=== RESET PASSWORD PROCESS ===');
    const { token, password } = req.body;
    console.log('Reset password request with token:', token ? token.substring(0, 10) + '...' : 'undefined');

    // Find valid token
    console.log('Looking for valid password reset token...');
    const passwordReset = await PasswordReset.findOne({
      where: {
        token,
        expiresAt: { [Op.gt]: new Date() },
        isUsed: false
      }
    });

    if (!passwordReset) {
      console.log('Invalid or expired token');
      return res.status(400).json({ msg: 'Invalid or expired token. Please request a new password reset.' });
    }

    console.log('Valid token found, token ID:', passwordReset.id);

    // Find user
    console.log('Looking for user with ID:', passwordReset.userId);
    const user = await User.findByPk(passwordReset.userId);
    if (!user) {
      console.log('User not found for token');
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log('User found:', user.id, user.email);

    // Hash new password
    console.log('Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    console.log('Updating user password...');
    await user.update({ password: hashedPassword });
    console.log('Password updated successfully');

    // Mark token as used
    console.log('Marking token as used...');
    await passwordReset.update({ isUsed: true });
    console.log('Token marked as used');

    // Return success message
    console.log('Password reset process completed successfully');
    res.status(200).json({ msg: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 