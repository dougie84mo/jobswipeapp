/**
 * Script to fix the Match model issue with the recruiter->user.name column
 * 
 * Run with: node scripts/fix-match-model.js
 */

const { sequelize, User, Match } = require('../models');

async function fixMatchModel() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if the database is SQLite
    const dialect = sequelize.getDialect();
    console.log(`Database dialect: ${dialect}`);

    // Try to fix the issue by directly modifying the Match model's association
    console.log('\nAttempting to fix the Match model issue...');
    
    // First, let's check if we can get matches without the problematic association
    try {
      console.log('Fetching matches without including associations...');
      const matches = await Match.findAll({
        limit: 5
      });
      console.log(`Found ${matches.length} matches`);
    } catch (error) {
      console.error('Error fetching matches:', error.message);
    }

    // Now let's try to fix the issue by creating a custom query
    console.log('\nTrying a custom query to get matches with recruiter info...');
    try {
      const [results] = await sequelize.query(`
        SELECT m.id, m.jobSeekerId, m.recruiterId, m.jobId, m.status,
               u.firstName, u.lastName, u.email
        FROM Matches m
        JOIN Users u ON m.recruiterId = u.id
        LIMIT 5;
      `);
      console.log(`Found ${results.length} matches with custom query`);
      if (results.length > 0) {
        console.log('Sample match:', results[0]);
      }
    } catch (error) {
      console.error('Error with custom query:', error.message);
    }

    // Let's check the Match model's associations
    console.log('\nChecking Match model associations...');
    try {
      // Get the Match model's associations
      const associations = Match.associations;
      console.log('Match model associations:');
      Object.keys(associations).forEach(key => {
        const association = associations[key];
        console.log(`- ${key}: ${association.associationType} to ${association.target.name}`);
      });
    } catch (error) {
      console.error('Error checking associations:', error.message);
    }

    // Let's try to fix the issue by creating a custom query for the jobs/recruiter endpoint
    console.log('\nCreating a custom query for the jobs/recruiter endpoint...');
    try {
      const userId = 'dbbb0f5b-b994-4ae1-bbda-aa9098b4d6e0'; // Example user ID
      const [results] = await sequelize.query(`
        SELECT j.*, c.name as companyName, c.logo as companyLogo
        FROM Jobs j
        JOIN RecruiterProfiles r ON j.recruiterId = r.id
        JOIN Companies c ON j.companyId = c.id
        WHERE r.userId = '${userId}'
        ORDER BY j.createdAt DESC;
      `);
      console.log(`Found ${results.length} jobs with custom query`);
      if (results.length > 0) {
        console.log('Sample job:', results[0]);
      }
    } catch (error) {
      console.error('Error with custom query for jobs:', error.message);
    }

    await sequelize.close();
    console.log('\nDatabase connection closed.');
    
    console.log('\nRecommendation:');
    console.log('1. Update the routes/jobs.js file to use a custom SQL query for the /recruiter endpoint');
    console.log('2. This will bypass the ORM issue with the recruiter->user.name column');
    console.log('3. Example code:');
    console.log(`
    router.get('/recruiter', [auth, recruiterCheck], async (req, res) => {
      try {
        console.log('GET /api/jobs/recruiter called with custom query');
        
        // Use a custom SQL query instead of the ORM
        const [jobs] = await sequelize.query(\`
          SELECT j.*, c.name as companyName, c.logo as companyLogo
          FROM Jobs j
          JOIN RecruiterProfiles r ON j.recruiterId = r.id
          JOIN Companies c ON j.companyId = c.id
          WHERE r.userId = '\${req.user.id}'
          ORDER BY j.createdAt DESC;
        \`);
        
        // Format jobs to match client expectations
        const formattedJobs = jobs.map(job => {
          // Format salary
          const salary = (job.salaryMin || job.salaryMax) ? 
            \`\${job.salaryMin || 0}-\${job.salaryMax || 0} \${job.salaryCurrency || 'USD'}\` : 
            null;
          
          return {
            ...job,
            salary,
            isActive: job.status === 'active',
            company: {
              id: job.companyId,
              name: job.companyName,
              logo: job.companyLogo
            }
          };
        });
        
        res.json(formattedJobs);
      } catch (err) {
        console.error('Get recruiter jobs error:', err);
        res.status(500).json({ msg: 'Server error', details: err.message });
      }
    });
    `);
  } catch (error) {
    console.error('Error fixing Match model:', error);
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(1);
  }
}

// Run the function
fixMatchModel(); 