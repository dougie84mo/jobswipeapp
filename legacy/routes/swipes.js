const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Swipe, Match, Job, User, RecruiterProfile, JobSeekerProfile } = require('../models');
const auth = require('../middleware/auth');
const axios = require('axios');

// @route   POST api/swipes
// @desc    Create a swipe (left or right)
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('direction', 'Direction must be either left or right').isIn(['left', 'right']),
      check('userType', 'User type must be either jobseeker or recruiter').isIn(['jobseeker', 'recruiter'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { direction, userType, jobId, jobSeekerId, notes } = req.body;

    try {
      // Validate that the user type matches their actual type
      if (userType !== req.user.userType) {
        return res.status(400).json({ msg: 'User type does not match your account type' });
      }

      // Validate that either jobId or jobSeekerId is provided based on user type
      if (userType === 'jobseeker' && !jobId) {
        return res.status(400).json({ msg: 'Job ID is required for job seekers' });
      }

      if (userType === 'recruiter' && !jobSeekerId) {
        return res.status(400).json({ msg: 'Job seeker ID is required for recruiters' });
      }

      // Check if user has already swiped on this job/candidate
      let existingSwipe;
      
      if (userType === 'jobseeker') {
        existingSwipe = await Swipe.findOne({
          where: {
            userId: req.user.id,
            jobId
          }
        });
      } else {
        existingSwipe = await Swipe.findOne({
          where: {
            userId: req.user.id,
            jobSeekerId
          }
        });
      }

      if (existingSwipe) {
        return res.status(400).json({ msg: 'You have already swiped on this item' });
      }

      // Create the swipe
      const swipeData = {
        userId: req.user.id,
        direction,
        userType,
        notes: notes || null,
        timestamp: new Date()
      };

      if (userType === 'jobseeker') {
        swipeData.jobId = jobId;
      } else {
        swipeData.jobSeekerId = jobSeekerId;
        swipeData.jobId = jobId; // For recruiters, jobId is also required
      }

      const swipe = await Swipe.create(swipeData);

      // Check if this creates a match (both parties swiped right)
      if (direction === 'right') {
        let matchingSwipe;
        
        if (userType === 'jobseeker') {
          // Get the job to find the recruiter
          const job = await Job.findByPk(jobId, {
            include: [
              {
                model: RecruiterProfile,
                as: 'recruiter'
              }
            ]
          });
          
          if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
          }
          
          // Check if the recruiter has swiped right on this job seeker for this job
          matchingSwipe = await Swipe.findOne({
            where: {
              userId: job.recruiter.userId,
              jobSeekerId: req.user.id,
              jobId,
              direction: 'right',
              userType: 'recruiter'
            }
          });
          
          // If there's a match, create a match record
          if (matchingSwipe) {
            // Calculate match score using AI service (if available)
            let matchScore = null;
            
            try {
              // Get job seeker profile
              const jobSeekerProfile = await JobSeekerProfile.findOne({
                where: { userId: req.user.id },
                include: [
                  {
                    model: User,
                    as: 'user'
                  }
                ]
              });
              
              // Call AI service for match score
              if (process.env.AI_SERVICE_URL) {
                const aiResponse = await axios.post(
                  `${process.env.AI_SERVICE_URL}/api/match-score`,
                  {
                    job: {
                      id: job.id,
                      title: job.title,
                      description: job.description,
                      requirements: job.requirements,
                      skills: job.skills,
                      industry: job.industry,
                      experienceLevel: job.experienceLevel
                    },
                    candidate: {
                      id: req.user.id,
                      skills: jobSeekerProfile.skills,
                      experience: jobSeekerProfile.experience,
                      education: jobSeekerProfile.education,
                      workHistory: jobSeekerProfile.workHistory,
                      desiredIndustries: jobSeekerProfile.desiredIndustries
                    }
                  },
                  {
                    headers: {
                      'x-api-key': process.env.AI_SERVICE_API_KEY
                    }
                  }
                );
                
                matchScore = aiResponse.data.score;
              }
            } catch (error) {
              console.error('Error calculating match score:', error);
              // Continue without match score if AI service fails
            }
            
            // Create match
            const match = await Match.create({
              jobSeekerId: req.user.id,
              recruiterId: job.recruiter.userId,
              jobId,
              matchDate: new Date(),
              status: 'active',
              matchScore
            });
            
            // Update job match count
            await job.update({
              matchCount: job.matchCount + 1
            });
            
            return res.json({
              swipe,
              match: {
                ...match.toJSON(),
                isNewMatch: true
              }
            });
          }
        } else if (userType === 'recruiter') {
          // Check if the job seeker has swiped right on this job
          matchingSwipe = await Swipe.findOne({
            where: {
              userId: jobSeekerId,
              jobId,
              direction: 'right',
              userType: 'jobseeker'
            }
          });
          
          // If there's a match, create a match record
          if (matchingSwipe) {
            // Calculate match score using AI service (if available)
            let matchScore = null;
            
            try {
              // Get job and job seeker profile
              const job = await Job.findByPk(jobId);
              const jobSeekerProfile = await JobSeekerProfile.findOne({
                where: { userId: jobSeekerId },
                include: [
                  {
                    model: User,
                    as: 'user'
                  }
                ]
              });
              
              // Call AI service for match score
              if (process.env.AI_SERVICE_URL) {
                const aiResponse = await axios.post(
                  `${process.env.AI_SERVICE_URL}/api/match-score`,
                  {
                    job: {
                      id: job.id,
                      title: job.title,
                      description: job.description,
                      requirements: job.requirements,
                      skills: job.skills,
                      industry: job.industry,
                      experienceLevel: job.experienceLevel
                    },
                    candidate: {
                      id: jobSeekerId,
                      skills: jobSeekerProfile.skills,
                      experience: jobSeekerProfile.experience,
                      education: jobSeekerProfile.education,
                      workHistory: jobSeekerProfile.workHistory,
                      desiredIndustries: jobSeekerProfile.desiredIndustries
                    }
                  },
                  {
                    headers: {
                      'x-api-key': process.env.AI_SERVICE_API_KEY
                    }
                  }
                );
                
                matchScore = aiResponse.data.score;
              }
            } catch (error) {
              console.error('Error calculating match score:', error);
              // Continue without match score if AI service fails
            }
            
            // Create match
            const match = await Match.create({
              jobSeekerId,
              recruiterId: req.user.id,
              jobId,
              matchDate: new Date(),
              status: 'active',
              matchScore
            });
            
            // Update job match count
            await Job.update(
              { matchCount: sequelize.literal('matchCount + 1') },
              { where: { id: jobId } }
            );
            
            return res.json({
              swipe,
              match: {
                ...match.toJSON(),
                isNewMatch: true
              }
            });
          }
        }
      }

      res.json({ swipe, match: null });
    } catch (err) {
      console.error('Create swipe error:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/swipes/history
// @desc    Get user's swipe history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, direction } = req.query;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {
      userId: req.user.id
    };
    
    if (direction) {
      whereConditions.direction = direction;
    }
    
    // Get swipes with related data
    const swipes = await Swipe.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Job,
          as: 'job',
          include: [
            {
              model: Company,
              as: 'company',
              attributes: ['id', 'name', 'logo']
            }
          ]
        },
        {
          model: User,
          as: 'jobSeeker',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'location']
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(swipes.count / limit);
    
    res.json({
      swipes: swipes.rows,
      pagination: {
        total: swipes.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (err) {
    console.error('Get swipe history error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/swipes/stats
// @desc    Get user's swipe statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    // Total swipes
    const totalSwipes = await Swipe.count({
      where: { userId: req.user.id }
    });
    
    // Right swipes
    const rightSwipes = await Swipe.count({
      where: {
        userId: req.user.id,
        direction: 'right'
      }
    });
    
    // Left swipes
    const leftSwipes = await Swipe.count({
      where: {
        userId: req.user.id,
        direction: 'left'
      }
    });
    
    // Matches
    let matches = 0;
    
    if (req.user.userType === 'jobseeker') {
      matches = await Match.count({
        where: { jobSeekerId: req.user.id }
      });
    } else {
      matches = await Match.count({
        where: { recruiterId: req.user.id }
      });
    }
    
    // Calculate percentages
    const rightSwipePercentage = totalSwipes > 0 ? (rightSwipes / totalSwipes) * 100 : 0;
    const leftSwipePercentage = totalSwipes > 0 ? (leftSwipes / totalSwipes) * 100 : 0;
    const matchRate = rightSwipes > 0 ? (matches / rightSwipes) * 100 : 0;
    
    res.json({
      totalSwipes,
      rightSwipes,
      leftSwipes,
      matches,
      rightSwipePercentage,
      leftSwipePercentage,
      matchRate
    });
  } catch (err) {
    console.error('Get swipe stats error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router; 