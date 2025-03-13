const jwt = require('jsonwebtoken');
const { User, Message } = require('./models');

module.exports = (io) => {
  // Store active users
  const activeUsers = {};

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      socket.user = {
        id: user.id,
        type: user.userType, // 'jobseeker' or 'recruiter'
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.firstName + ' ' + user.lastName
      };
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Add user to active users
    activeUsers[socket.user.id] = socket.id;
    
    // Join personal room for direct messages
    socket.join(`user:${socket.user.id}`);
    
    // Notify others that user is online
    io.emit('user_status', { 
      userId: socket.user.id, 
      status: 'online' 
    });

    // Handle joining a chat room
    socket.on('join_chat', async ({ matchId }) => {
      socket.join(`match:${matchId}`);
      console.log(`${socket.user.fullName} joined chat for match ${matchId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { matchId, content } = data;
        
        // Save message to database
        const message = await Message.create({
          senderId: socket.user.id,
          matchId,
          content,
          read: false
        });
        
        // Broadcast to everyone in the match room
        io.to(`match:${matchId}`).emit('new_message', {
          id: message.id,
          senderId: message.senderId,
          senderName: socket.user.fullName,
          content: message.content,
          createdAt: message.createdAt
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ matchId, isTyping }) => {
      socket.to(`match:${matchId}`).emit('user_typing', {
        userId: socket.user.id,
        userName: socket.user.fullName,
        isTyping
      });
    });

    // Handle read receipts
    socket.on('mark_read', async ({ matchId, messageIds }) => {
      try {
        await Message.update(
          { read: true },
          { where: { id: messageIds, matchId } }
        );
        
        socket.to(`match:${matchId}`).emit('messages_read', {
          userId: socket.user.id,
          messageIds
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
      delete activeUsers[socket.user.id];
      
      // Notify others that user is offline
      io.emit('user_status', { 
        userId: socket.user.id, 
        status: 'offline' 
      });
    });
  });
}; 