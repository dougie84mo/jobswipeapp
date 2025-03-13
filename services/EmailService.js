const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    console.log('Initializing EmailService...');
    this.transporter = null;
    this.ready = false;
    this.initPromise = this.init();
  }

  async init() {
    // Create a test account if we're in development mode and no SMTP settings are provided
    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
      console.log('No SMTP settings found, creating test account...');
      await this.createTestAccount();
    } else {
      console.log('Using configured SMTP settings');
      this.createTransporter();
    }
    this.ready = true;
    return this;
  }

  async createTestAccount() {
    try {
      // Create a test account using Ethereal
      console.log('Creating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      
      // Create a transporter with the test account
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      console.log('=======================================');
      console.log('Created test email account:', testAccount.user);
      console.log('Test email password:', testAccount.pass);
      console.log('View test emails at: https://ethereal.email');
      console.log('=======================================');
      
    } catch (error) {
      console.error('Failed to create test email account:', error);
      throw error;
    }
  }

  createTransporter() {
    // Log the email configuration being used (without sensitive data)
    console.log('Email configuration:');
    console.log('- Host:', process.env.SMTP_HOST || config.email.host);
    console.log('- Port:', process.env.SMTP_PORT || config.email.port);
    console.log('- Secure:', process.env.SMTP_SECURE === 'true' || config.email.secure);
    console.log('- From:', process.env.SMTP_FROM || config.email.from);
    
    // Create a transporter with the configured SMTP settings
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || config.email.host,
      port: process.env.SMTP_PORT || config.email.port,
      secure: process.env.SMTP_SECURE === 'true' || config.email.secure,
      auth: {
        user: process.env.SMTP_USER || config.email.user,
        pass: process.env.SMTP_PASS || config.email.pass,
      },
    });
    
    // Verify the connection configuration
    this.verifyConnection();
  }
  
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
    }
  }

  async ensureReady() {
    if (!this.ready) {
      await this.initPromise;
    }
    if (!this.transporter) {
      throw new Error('Email transporter is not initialized');
    }
  }

  async sendPasswordResetEmail(to, resetToken) {
    await this.ensureReady();
    
    const resetUrl = `${process.env.CLIENT_URL || config.clientUrl}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"JobActual" <${process.env.SMTP_FROM || config.email.from}>`,
      to,
      subject: 'Reset Your JobActual Password',
      text: `
        Hello,
        
        You requested to reset your password for your JobActual account.
        
        Please click the link below to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you did not request this, please ignore this email and your password will remain unchanged.
        
        Best regards,
        The JobActual Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6ee0;">Reset Your JobActual Password</h2>
          <p>Hello,</p>
          <p>You requested to reset your password for your JobActual account.</p>
          <p>Please click the button below to reset your password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>Best regards,<br>The JobActual Team</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            If the button above doesn't work, copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #4a6ee0;">${resetUrl}</a>
          </p>
        </div>
      `,
    };
    
    try {
      console.log(`Sending password reset email to: ${to}`);
      const info = await this.transporter.sendMail(mailOptions);
      
      // If using Ethereal, log the preview URL
      if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
        console.log('=======================================');
        console.log('Email sent! Preview URL:', nodemailer.getTestMessageUrl(info));
        console.log('=======================================');
      } else {
        console.log('Email sent successfully:', info.messageId);
      }
      
      return info;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(to, firstName) {
    await this.ensureReady();
    
    const mailOptions = {
      from: `"JobActual" <${process.env.SMTP_FROM || config.email.from}>`,
      to,
      subject: 'Welcome to JobActual!',
      text: `
        Hello ${firstName},
        
        Welcome to JobActual! We're excited to have you on board.
        
        Your account has been successfully created, and you can now start using our platform.
        
        Best regards,
        The JobActual Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6ee0;">Welcome to JobActual!</h2>
          <p>Hello ${firstName},</p>
          <p>Welcome to JobActual! We're excited to have you on board.</p>
          <p>Your account has been successfully created, and you can now start using our platform.</p>
          <p>Best regards,<br>The JobActual Team</p>
        </div>
      `,
    };
    
    try {
      console.log(`Sending welcome email to: ${to}`);
      const info = await this.transporter.sendMail(mailOptions);
      
      // If using Ethereal, log the preview URL
      if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
        console.log('=======================================');
        console.log('Email sent! Preview URL:', nodemailer.getTestMessageUrl(info));
        console.log('=======================================');
      } else {
        console.log('Email sent successfully:', info.messageId);
      }
      
      return info;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 