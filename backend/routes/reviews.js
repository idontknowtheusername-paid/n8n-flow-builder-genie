
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Create review
router.post('/', authenticate, [
  body('reviewedUserId').optional().isUUID(),
  body('listingId').optional().isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reviewedUserId, listingId, rating, comment } = req.body;

    // Must review either a user or a listing
    if (!reviewedUserId && !listingId) {
      return res.status(400).json({ message: 'Either reviewedUserId or listingId must be provided' });
    }

    // Cannot review yourself
    if (reviewedUserId === req.user.id) {
      return res.status(400).json({ message: 'Cannot review yourself' });
    }

    // Check if already reviewed
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE reviewer_id = $1 AND (reviewed_user_id = $2 OR listing_id = $3)',
      [req.user.id, reviewedUserId, listingId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this item' });
    }

    const result = await db.query(`
      INSERT INTO reviews (reviewer_id, reviewed_user_id, listing_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, reviewedUserId, listingId, rating, comment]);

    // Create notification for the reviewed user
    if (reviewedUserId) {
      await db.query(`
        INSERT INTO notifications (user_id, type, title, content, link)
        VALUES ($1, 'NEW_REVIEW', 'New Review', $2, '/profile/reviews')
      `, [reviewedUserId, `${req.user.first_name} left you a ${rating}-star review`]);
    }

    res.status(201).json({
      message: 'Review created successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT r.*, 
             u.first_name as reviewer_first_name, 
             u.last_name as reviewer_last_name,
             u.profile_picture_url as reviewer_avatar,
             l.title as listing_title,
             COUNT(*) OVER() as total_count
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.reviewed_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      reviews: result.rows.map(row => {
        const { total_count, ...review } = row;
        return review;
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews for a listing
router.get('/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT r.*, 
             u.first_name as reviewer_first_name, 
             u.last_name as reviewer_last_name,
             u.profile_picture_url as reviewer_avatar,
             COUNT(*) OVER() as total_count
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.listing_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [listingId, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      reviews: result.rows.map(row => {
        const { total_count, ...review } = row;
        return review;
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });
  } catch (error) {
    console.error('Get listing reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update review
router.put('/:id', authenticate, [
  param('id').isUUID(),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    const result = await db.query(`
      UPDATE reviews 
      SET rating = COALESCE($1, rating),
          comment = COALESCE($2, comment),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND reviewer_id = $4
      RETURNING *
    `, [rating, comment, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }

    res.json({
      message: 'Review updated successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete review
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM reviews WHERE id = $1 AND reviewer_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
