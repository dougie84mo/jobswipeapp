/**
 * Script to fix the Job model's associations and queries
 * This script updates references to user.name to use firstName and lastName instead
 */

const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Initialize database connection
console.log('Connecting to database...');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

async function main() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Connection established successfully.');
    console.log('Database dialect:', sequelize.getDialect());
    
    console.log('\nFixing Job model associations and queries...');
    
    // 1. Check if we can find the Job model file
    const modelsDir = path.join(__dirname, '..', 'models');
    const jobModelPath = path.join(modelsDir, 'Job.js');
    
    if (fs.existsSync(jobModelPath)) {
      console.log('Found Job model at:', jobModelPath);
      
      // Read the Job model file
      let jobModelContent = fs.readFileSync(jobModelPath, 'utf8');
      
      // Check if it contains references to user.name
      if (jobModelContent.includes('user.name') || jobModelContent.includes('user.avatar')) {
        console.log('Found references to user.name or user.avatar in Job model');
        
        // Update the references
        jobModelContent = jobModelContent.replace(/(['"])name(['"])/g, '$1firstName$2, $1lastName$2');
        jobModelContent = jobModelContent.replace(/(['"])avatar(['"])/g, '$1profilePicture$2');
        
        // Write the updated content back to the file
        fs.writeFileSync(jobModelPath, jobModelContent);
        console.log('Updated Job model file');
      } else {
        console.log('No direct references to user.name found in Job model');
      }
    } else {
      console.log('Job model file not found at expected location');
    }
    
    // 2. Check for include statements in route files
    const routesDir = path.join(__dirname, '..', 'routes');
    const jobRoutesPath = path.join(routesDir, 'jobs.js');
    
    if (fs.existsSync(jobRoutesPath)) {
      console.log('\nFound jobs routes at:', jobRoutesPath);
      
      // Read the jobs routes file
      let jobRoutesContent = fs.readFileSync(jobRoutesPath, 'utf8');
      
      // Check for include statements with user.name
      const includePattern = /include:\s*\[\s*{\s*model:\s*.*User[^]*?attributes:\s*\[[^\]]*?['"]name['"][^\]]*?\]/g;
      if (includePattern.test(jobRoutesContent)) {
        console.log('Found include statements with user.name in jobs routes');
        
        // Update the attributes to use firstName and lastName instead of name
        jobRoutesContent = jobRoutesContent.replace(/attributes:\s*\[[^\]]*?(['"])name(['"])[^\]]*?\]/g, (match) => {
          return match.replace(/(['"])name(['"])/g, '$1firstName$2, $1lastName$2');
        });
        
        // Update avatar to profilePicture
        jobRoutesContent = jobRoutesContent.replace(/(['"])avatar(['"])/g, '$1profilePicture$2');
        
        // Write the updated content back to the file
        fs.writeFileSync(jobRoutesPath, jobRoutesContent);
        console.log('Updated include statements in jobs routes');
      }
      
      // 3. Check for custom SQL queries
      const customQueryPattern = /sequelize\.query\(\s*`[^`]*?recruiter->user\.name/g;
      if (customQueryPattern.test(jobRoutesContent)) {
        console.log('\nFound custom SQL queries with recruiter->user.name');
        
        // Replace the custom queries to use firstName and lastName
        jobRoutesContent = jobRoutesContent.replace(/recruiter->user\.name/g, "CONCAT(recruiter->user.firstName, ' ', recruiter->user.lastName)");
        jobRoutesContent = jobRoutesContent.replace(/recruiter->user\.avatar/g, "recruiter->user.profilePicture");
        
        // Write the updated content back to the file
        fs.writeFileSync(jobRoutesPath, jobRoutesContent);
        console.log('Updated custom SQL queries in jobs routes');
      }
      
      // 4. Check for findByPk or findOne calls that might include user associations
      console.log('\nChecking for findByPk or findOne calls with user associations...');
      
      // Look for Job.findByPk or Job.findOne with include
      const findPattern = /Job\.find(ByPk|One)\([^)]*\)\s*\.\s*then\(/g;
      if (findPattern.test(jobRoutesContent)) {
        console.log('Found Job.findByPk or Job.findOne calls in jobs routes');
        
        // Add a custom handler for the specific route that's causing the error
        if (jobRoutesContent.includes('router.get(\'/:id\'')) {
          console.log('Found the job/:id route handler');
          
          // Replace the route handler with a custom implementation that uses raw SQL
          const newRouteHandler = `
// @route   GET api/jobs/:id
// @desc    Get job by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    console.log('GET /api/jobs/:id called with id:', req.params.id);
    
    // Use a custom SQL query to avoid the issue with user.name
    const [job] = await sequelize.query(\`
      SELECT j.*, 
        c.id AS "company.id", 
        c.name AS "company.name", 
        c.logo AS "company.logo",
        r.id AS "recruiter.id",
        r.userId AS "recruiter.userId",
        r.title AS "recruiter.title",
        u.id AS "recruiter.user.id",
        u.firstName AS "recruiter.user.firstName",
        u.lastName AS "recruiter.user.lastName",
        u.email AS "recruiter.user.email",
        u.profilePicture AS "recruiter.user.profilePicture"
      FROM Jobs j
      LEFT JOIN Companies c ON j.companyId = c.id
      LEFT JOIN RecruiterProfiles r ON j.recruiterId = r.id
      LEFT JOIN Users u ON r.userId = u.id
      WHERE j.id = :jobId
    \`, {
      replacements: { jobId: req.params.id },
      type: QueryTypes.SELECT
    });
    
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }
    
    // Format the job data to match the expected structure
    const formattedJob = {
      ...job,
      skills: job.skills ? JSON.parse(job.skills) : [],
      benefits: job.benefits ? JSON.parse(job.benefits) : [],
      company: {
        id: job["company.id"],
        name: job["company.name"],
        logo: job["company.logo"]
      },
      recruiter: {
        id: job["recruiter.id"],
        userId: job["recruiter.userId"],
        title: job["recruiter.title"],
        user: {
          id: job["recruiter.user.id"],
          name: \`\${job["recruiter.user.firstName"]} \${job["recruiter.user.lastName"]}\`,
          email: job["recruiter.user.email"],
          profilePicture: job["recruiter.user.profilePicture"]
        }
      }
    };
    
    res.json(formattedJob);
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).send('Server error');
  }
});`;
          
          // Replace the existing route handler with our new one
          jobRoutesContent = jobRoutesContent.replace(/router\.get\('\/:id'[^]*?}\)\;/s, newRouteHandler);
          
          // Write the updated content back to the file
          fs.writeFileSync(jobRoutesPath, jobRoutesContent);
          console.log('Updated the job/:id route handler with a custom implementation');
        }
      }
      
      // 5. Check for the recruiter jobs endpoint
      if (jobRoutesContent.includes('router.get(\'/recruiter\'')) {
        console.log('\nFound the jobs/recruiter route handler');
        
        // Replace the route handler with a custom implementation that uses raw SQL
        const newRecruiterRouteHandler = `
// @route   GET api/jobs/recruiter
// @desc    Get all jobs posted by the current recruiter
// @access  Private (Recruiter only)
router.get('/recruiter', [auth, recruiterCheck], async (req, res) => {
  try {
    console.log('GET /api/jobs/recruiter called');
    
    // Use a custom SQL query instead of the ORM to avoid the issue with recruiter->user.name
    const [jobs] = await sequelize.query(\`
      SELECT j.*, 
        c.id AS "company.id", 
        c.name AS "company.name", 
        c.logo AS "company.logo"
      FROM Jobs j
      JOIN RecruiterProfiles r ON j.recruiterId = r.id
      JOIN Companies c ON j.companyId = c.id
      WHERE r.userId = :userId
      ORDER BY j.createdAt DESC
    \`, {
      replacements: { userId: req.user.id },
      type: QueryTypes.SELECT
    });
    
    // Format jobs to match client expectations
    const formattedJobs = jobs.map(job => {
      // Format salary
      const salary = (job.salaryMin || job.salaryMax) ?
        \`\${job.salaryMin || 0}-\${job.salaryMax || 0} \${job.salaryCurrency || 'USD'}\` :
        null;
      
      // Parse JSON fields
      const skills = job.skills ? JSON.parse(job.skills) : [];
      const benefits = job.benefits ? JSON.parse(job.benefits) : [];
      
      return {
        ...job,
        skills,
        benefits,
        salary,
        isActive: job.status === 'active',
        company: {
          id: job["company.id"],
          name: job["company.name"],
          logo: job["company.logo"]
        }
      };
    });
    
    res.json(formattedJobs);
  } catch (err) {
    console.error('Get recruiter jobs error:', err);
    res.status(500).send('Server error');
  }
});`;
        
        // Replace the existing route handler with our new one
        jobRoutesContent = jobRoutesContent.replace(/router\.get\('\/recruiter'[^]*?}\)\;/s, newRecruiterRouteHandler);
        
        // Write the updated content back to the file
        fs.writeFileSync(jobRoutesPath, jobRoutesContent);
        console.log('Updated the jobs/recruiter route handler with a custom implementation');
      }
    } else {
      console.log('Jobs routes file not found at expected location');
    }
    
    console.log('\nAll fixes applied. Please restart your server for changes to take effect.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the main function
main(); 