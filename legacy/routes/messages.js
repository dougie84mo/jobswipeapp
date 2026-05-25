const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Message, Match, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/messages';
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    // Allow all file types for now, but could restrict based on requirements
    cb(null, true);
  }
});

// @route   POST api/messages
// @desc    Send a message
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('matchId', 'Match ID is required').not().isEmpty(),
      check('content', 'Message content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { matchId, content } = req.body;

    try {
      // Check if match exists and user is part of it
      const match = await Match.findByPk(matchId);
      
      if (!match) {
        return res.status(404).json({ msg: 'Match not found' });
      }
      
      if (match.jobSeekerId !== req.user.id && match.recruiterId !== req.user.id) {
        return res.status(403).json({ msg: 'Not authorized to send messages in this match' });
      }
      
      // Check if match is active
      if (match.status !== 'active') {
        return res.status(400).json({ msg: 'Cannot send messages in an inactive match' });
      }

      // Create message
      const message = await Message.create({
        matchId,
        senderId: req.user.id,
        content,
        type: 'text',
        read: false
      });

      // Update match with last message date
      await match.update({
        lastMessageDate: new Date()
      });

      // Get sender info to return with response
      const sender = await User.findByPk(req.user.id, {
        attributes: ['id', 'firstName', 'lastName', 'profilePicture']
      });

      res.json({
        ...message.toJSON(),
        sender
      });
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/messages/attachment
// @desc    Send a message with attachment
// @access  Private
router.post('/attachment', [auth, upload.single('file')], async (req, res) => {
  try {
    const { matchId, content } = req.body;
    
    if (!matchId) {
      return res.status(400).json({ msg: 'Match ID is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Check if match exists and user is part of it
    const match = await Match.findByPk(matchId);
    
    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }
    
    if (match.jobSeekerId !== req.user.id && match.recruiterId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to send messages in this match' });
    }
    
    // Check if match is active
    if (match.status !== 'active') {
      return res.status(400).json({ msg: 'Cannot send messages in an inactive match' });
    }

    // Determine file type
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt);
    
    // Create message with attachment
    const message = await Message.create({
      matchId,
      senderId: req.user.id,
      content: content || req.file.originalname,
      type: isImage ? 'image' : 'file',
      attachments: [{
        url: `/uploads/messages/${req.file.filename}`,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }],
      read: false
    });

    // Update match with last message date
    await match.update({
      lastMessageDate: new Date()
    });

    // Get sender info to return with response
    const sender = await User.findByPk(req.user.id, {
      attributes: ['id', 'firstName', 'lastName', 'profilePicture']
    });

    res.json({
      ...message.toJSON(),
      sender
    });
  } catch (err) {
    console.error('Send message with attachment error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/messages/:matchId
// @desc    Get messages for a match
// @access  Private
router.get('/:matchId', auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if match exists and user is part of it
    const match = await Match.findByPk(matchId);
    
    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }
    
    if (match.jobSeekerId !== req.user.id && match.recruiterId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view messages in this match' });
    }

    // Get messages with pagination
    const messages = await Message.findAndCountAll({
      where: { matchId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Mark unread messages as read
    await Message.update(
      { read: true, readAt: new Date() },
      {
        where: {
          matchId,
          senderId: {
            [Op.ne]: req.user.id
          },
          read: false
        }
      }
    );

    // Calculate total pages
    const totalPages = Math.ceil(messages.count / limit);
    
    res.json({
      messages: messages.rows,
      pagination: {
        total: messages.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/messages/read
// @desc    Mark messages as read
// @access  Private
router.put('/read', auth, async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ msg: 'Message IDs are required' });
    }

    // Verify user has access to these messages
    const messages = await Message.findAll({
      where: {
        id: messageIds
      },
      include: [
        {
          model: Match,
          as: 'match'
        }
      ]
    });

    // Check if user is part of the match for each message
    for (const message of messages) {
      if (message.match.jobSeekerId !== req.user.id && message.match.recruiterId !== req.user.id) {
        return res.status(403).json({ msg: 'Not authorized to mark these messages as read' });
      }
    }

    // Mark messages as read
    await Message.update(
      { read: true, readAt: new Date() },
      {
        where: {
          id: messageIds
        }
      }
    );

    res.json({ success: true, messageIds });
  } catch (err) {
    console.error('Mark messages as read error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/messages/unread/count
// @desc    Get count of unread messages
// @access  Private
router.get('/unread/count', auth, async (req, res) => {
  try {
    // Get all matches for the user
    let matches;
    
    if (req.user.userType === 'jobseeker') {
      matches = await Match.findAll({
        where: { jobSeekerId: req.user.id }
      });
    } else {
      matches = await Match.findAll({
        where: { recruiterId: req.user.id }
      });
    }
    
    const matchIds = matches.map(match => match.id);
    
    // Count unread messages
    const unreadCount = await Message.count({
      where: {
        matchId: matchIds,
        senderId: {
          [Op.ne]: req.user.id
        },
        read: false
      }
    });
    
    // Get unread counts by match
    const unreadByMatch = await Message.findAll({
      attributes: [
        'matchId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        matchId: matchIds,
        senderId: {
          [Op.ne]: req.user.id
        },
        read: false
      },
      group: ['matchId']
    });
    
    res.json({
      totalUnread: unreadCount,
      unreadByMatch: unreadByMatch.map(item => ({
        matchId: item.matchId,
        count: parseInt(item.get('count'))
      }))
    });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router; 