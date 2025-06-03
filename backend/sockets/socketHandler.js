
const jwt = require('jsonwebtoken');
const db = require('../config/database');

module.exports = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const result = await db.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.user = result.rows[0];
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.id} connected`);

    // Join user-specific room
    socket.join(`user_${socket.user.id}`);

    // Update user online status
    await db.query(
      'UPDATE users SET is_online = true WHERE id = $1',
      [socket.user.id]
    );

    // Broadcast to contacts that user is online
    socket.broadcast.emit('user_online', { userId: socket.user.id });

    // Handle joining conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Verify user is part of the conversation
        const result = await db.query(
          'SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
          [conversationId, socket.user.id]
        );

        if (result.rows.length > 0) {
          socket.join(`conversation_${conversationId}`);
          console.log(`User ${socket.user.id} joined conversation ${conversationId}`);
        }
      } catch (error) {
        console.error('Join conversation error:', error);
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${socket.user.id} left conversation ${conversationId}`);
    });

    // Handle real-time messaging
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, attachmentUrl } = data;

        // Verify user is part of the conversation
        const conversationResult = await db.query(
          'SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
          [conversationId, socket.user.id]
        );

        if (conversationResult.rows.length === 0) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const conversation = conversationResult.rows[0];
        const receiverId = conversation.participant1_id === socket.user.id 
          ? conversation.participant2_id 
          : conversation.participant1_id;

        // Create message in database
        const messageResult = await db.query(`
          INSERT INTO messages (conversation_id, sender_id, content, attachment_url)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [conversationId, socket.user.id, content, attachmentUrl]);

        const message = {
          ...messageResult.rows[0],
          first_name: socket.user.first_name,
          last_name: socket.user.last_name
        };

        // Update conversation's last message
        await db.query(
          'UPDATE conversations SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [message.id, conversationId]
        );

        // Emit to conversation room
        io.to(`conversation_${conversationId}`).emit('new_message', message);

        // Emit to receiver's personal room
        io.to(`user_${receiverId}`).emit('new_conversation_message', {
          conversationId,
          message
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.user.id,
        firstName: socket.user.first_name
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId: socket.user.id
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.id} disconnected`);

      // Update user online status
      await db.query(
        'UPDATE users SET is_online = false WHERE id = $1',
        [socket.user.id]
      );

      // Broadcast to contacts that user is offline
      socket.broadcast.emit('user_offline', { userId: socket.user.id });
    });
  });
};
