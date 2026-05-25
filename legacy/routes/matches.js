const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Match, User, Job, Company, Message } = require('../models');
const auth = require('../middleware/auth');

// @route   GET api/matches
// @desc    Get all matches for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let matches;
    
    if (req.user.userType === 'jobseeker') {
      matches = await Match.findAll({
        where: {
          jobSeekerId: req.user.id,
          [Op.or]: [
            { jobSeekerArchived: false },
            { jobSeekerArchived: null }
          ]
        },
        include: [
          {
            model: User,
            as: 'recruiter',
            attributes: ['id', 'firstName', 'lastName', 'profilePicture']
          },
          {
            model: Job,
            as: 'job',
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['id', 'name', 'logo', 'industry']
              }
            ]
          }
        ],
        order: [['lastMessageDate', 'DESC'], ['matchDate', 'DESC']]
      });
    } else if (req.user.userType === 'recruiter') {
      matches = await Match.findAll({
        where: {
          recruiterId: req.user.id,
          [Op.or]: [
            { recruiterArchived: false },
            { recruiterArchived: null }
          ]
        },
        include: [
          {
            model: User,
            as: 'jobSeeker',
            attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'location']
          },
          {
            model: Job,
            as: 'job'
          }
        ],
        order: [['lastMessageDate', 'DESC'], ['matchDate', 'DESC']]
      });
    }

    // Get unread message counts for each match
    const matchesWithUnreadCount = await Promise.all(
      matches.map(async (match) => {
        const matchData = match.toJSON();
        
        // Count unread messages
        const unreadCount = await Message.count({
          where: {
            matchId: match.id,
            senderId: {
              [Op.ne]: req.user.id
            },
            read: false
          }
        });
        
        // Get last message
        const lastMessage = await Message.findOne({
          where: {
            matchId: match.id
          },
          order: [['createdAt', 'DESC']],
          attributes: ['content', 'createdAt', 'senderId']
        });
        
        matchData.unreadCount = unreadCount;
        matchData.lastMessage = lastMessage;
        
        return matchData;
      })
    );

    res.json(matchesWithUnreadCount);
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/matches/:id
// @desc    Get match by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'jobSeeker',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'location', 'bio']
        },
        {
          model: User,
          as: 'recruiter',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture']
        },
        {
          model: Job,
          as: 'job',
          include: [
            {
              model: Company,
              as: 'company'
            }
          ]
        }
      ]
    });

    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }

    // Check if user is part of this match
    if (match.jobSeekerId !== req.user.id && match.recruiterId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this match' });
    }

    // Get messages for this match
    const messages = await Message.findAll({
      where: { matchId: match.id },
      order: [['createdAt', 'ASC']]
    });

    // Mark unread messages as read
    await Message.update(
      { read: true, readAt: new Date() },
      {
        where: {
          matchId: match.id,
          senderId: {
            [Op.ne]: req.user.id
          },
          read: false
        }
      }
    );

    res.json({
      match,
      messages
    });
  } catch (err) {
    console.error('Get match by ID error:', err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/matches/:id
// @desc    Update match status
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);

    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }

    // Check if user is part of this match
    if (match.jobSeekerId !== req.user.id && match.recruiterId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to update this match' });
    }

    const { status, notes, jobSeekerArchived, recruiterArchived } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    // Handle archiving based on user type
    if (req.user.userType === 'jobseeker' && jobSeekerArchived !== undefined) {
      updateData.jobSeekerArchived = jobSeekerArchived;
    }
    
    if (req.user.userType === 'recruiter' && recruiterArchived !== undefined) {
      updateData.recruiterArchived = recruiterArchived;
    }

    await match.update(updateData);

    res.json(await Match.findByPk(req.params.id));
  } catch (err) {
    console.error('Update match error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/matches/stats/overview
// @desc    Get match statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    let stats = {};
    
    if (req.user.userType === 'jobseeker') {
      // Total matches
      const totalMatches = await Match.count({
        where: { jobSeekerId: req.user.id }
      });
      
      // Active matches
      const activeMatches = await Match.count({
        where: {
          jobSeekerId: req.user.id,
          status: 'active'
        }
      });
      
      // Archived matches
      const archivedMatches = await Match.count({
        where: {
          jobSeekerId: req.user.id,
          jobSeekerArchived: true
        }
      });
      
      // Hired matches
      const hiredMatches = await Match.count({
        where: {
          jobSeekerId: req.user.id,
          status: 'hired'
        }
      });
      
      // Rejected matches
      const rejectedMatches = await Match.count({
        where: {
          jobSeekerId: req.user.id,
          status: 'rejected'
        }
      });
      
      stats = {
        totalMatches,
        activeMatches,
        archivedMatches,
        hiredMatches,
        rejectedMatches
      };
    } else if (req.user.userType === 'recruiter') {
      // Total matches
      const totalMatches = await Match.count({
        where: { recruiterId: req.user.id }
      });
      
      // Active matches
      const activeMatches = await Match.count({
        where: {
          recruiterId: req.user.id,
          status: 'active'
        }
      });
      
      // Archived matches
      const archivedMatches = await Match.count({
        where: {
          recruiterId: req.user.id,
          recruiterArchived: true
        }
      });
      
      // Hired matches
      const hiredMatches = await Match.count({
        where: {
          recruiterId: req.user.id,
          status: 'hired'
        }
      });
      
      // Rejected matches
      const rejectedMatches = await Match.count({
        where: {
          recruiterId: req.user.id,
          status: 'rejected'
        }
      });
      
      // Matches by job
      const matchesByJob = await Match.findAll({
        where: { recruiterId: req.user.id },
        attributes: [
          'jobId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'matchCount']
        ],
        include: [
          {
            model: Job,
            as: 'job',
            attributes: ['title']
          }
        ],
        group: ['jobId', 'job.id'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 5
      });
      
      stats = {
        totalMatches,
        activeMatches,
        archivedMatches,
        hiredMatches,
        rejectedMatches,
        matchesByJob
      };
    }
    
    res.json(stats);
  } catch (err) {
    console.error('Get match stats error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router; 