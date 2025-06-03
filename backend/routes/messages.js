
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, 
             u1.first_name as participant1_first_name, u1.last_name as participant1_last_name,
             u2.first_name as participant2_first_name, u2.last_name as participant2_last_name,
             l.title as listing_title,
             m.content as last_message_content, m.created_at as last_message_time
      FROM conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      LEFT JOIN listings l ON c.listing_id = l.id
      LEFT JOIN messages m ON c.last_message_id = m.id
      WHERE c.participant1_id = $1 OR c.participant2_id = $1
      ORDER BY COALESCE(m.created_at, c.created_at) DESC
    `, [req.user.id]);

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is part of the conversation
    const conversationResult = await db.query(
      'SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
      [conversationId, req.user.id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const result = await db.query(`
      SELECT m.*, u.first_name, u.last_name, u.profile_picture_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, offset]);

    // Mark messages as read
    await db.query(
      'UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2',
      [conversationId, req.user.id]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/conversations/:conversationId/messages', authenticate, [
  body('content').trim().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { content, attachmentUrl } = req.body;

    // Check if user is part of the conversation
    const conversationResult = await db.query(
      'SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
      [conversationId, req.user.id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const conversation = conversationResult.rows[0];
    const receiverId = conversation.participant1_id === req.user.id 
      ? conversation.participant2_id 
      : conversation.participant1_id;

    // Create message
    const messageResult = await db.query(`
      INSERT INTO messages (conversation_id, sender_id, content, attachment_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [conversationId, req.user.id, content, attachmentUrl]);

    const message = messageResult.rows[0];

    // Update conversation's last message
    await db.query(
      'UPDATE conversations SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [message.id, conversationId]
    );

    // Get sender info
    const senderResult = await db.query(
      'SELECT first_name, last_name, profile_picture_url FROM users WHERE id = $1',
      [req.user.id]
    );

    const messageWithSender = {
      ...message,
      ...senderResult.rows[0]
    };

    // Emit real-time message via Socket.IO
    const io = req.app.get('io');
    io.to(`user_${receiverId}`).emit('new_message', {
      message: messageWithSender,
      conversationId
    });

    // Create notification
    await db.query(`
      INSERT INTO notifications (user_id, type, title, content, link)
      VALUES ($1, 'NEW_MESSAGE', 'New Message', $2, '/messages/${conversationId}')
    `, [receiverId, `New message from ${senderResult.rows[0].first_name}`]);

    res.status(201).json({ message: messageWithSender });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start conversation
router.post('/conversations', authenticate, [
  body('participantId').isUUID(),
  body('listingId').optional().isUUID(),
  body('initialMessage').trim().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { participantId, listingId, initialMessage } = req.body;

    if (participantId === req.user.id) {
      return res.status(400).json({ message: 'Cannot start conversation with yourself' });
    }

    // Check if conversation already exists
    const existingConversation = await db.query(`
      SELECT id FROM conversations 
      WHERE ((participant1_id = $1 AND participant2_id = $2) 
          OR (participant1_id = $2 AND participant2_id = $1))
      AND ($3::uuid IS NULL OR listing_id = $3)
    `, [req.user.id, participantId, listingId]);

    let conversationId;

    if (existingConversation.rows.length > 0) {
      conversationId = existingConversation.rows[0].id;
    } else {
      // Create new conversation
      const conversationResult = await db.query(`
        INSERT INTO conversations (participant1_id, participant2_id, listing_id)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [req.user.id, participantId, listingId]);

      conversationId = conversationResult.rows[0].id;
    }

    // Send initial message
    const messageResult = await db.query(`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [conversationId, req.user.id, initialMessage]);

    const message = messageResult.rows[0];

    // Update conversation's last message
    await db.query(
      'UPDATE conversations SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [message.id, conversationId]
    );

    res.status(201).json({ 
      conversationId,
      message 
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
