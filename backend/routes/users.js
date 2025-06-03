
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.profile_picture_url, 
             u.created_at, u.kyc_status,
             COUNT(l.id) as total_listings,
             AVG(r.rating) as average_rating,
             COUNT(r.id) as total_reviews
      FROM users u
      LEFT JOIN listings l ON u.id = l.user_id AND l.status = 'ACTIVE'
      LEFT JOIN reviews r ON u.id = r.reviewed_user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    user.average_rating = user.average_rating ? parseFloat(user.average_rating).toFixed(1) : null;

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/me', authenticate, [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('phoneNumber').optional().isMobilePhone(),
  body('preferredLanguage').optional().isIn(['fr', 'en']),
  body('currency').optional().isIn(['XOF', 'USD', 'EUR'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      phoneNumber,
      address,
      preferredLanguage,
      currency,
      profilePictureUrl
    } = req.body;

    const result = await db.query(`
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone_number = COALESCE($3, phone_number),
          address = COALESCE($4, address),
          preferred_language = COALESCE($5, preferred_language),
          currency = COALESCE($6, currency),
          profile_picture_url = COALESCE($7, profile_picture_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, first_name, last_name, email, phone_number, 
                profile_picture_url, address, preferred_language, currency
    `, [firstName, lastName, phoneNumber, address ? JSON.stringify(address) : null,
        preferredLanguage, currency, profilePictureUrl, req.user.id]);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/me/password', authenticate, [
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit KYC documents
router.post('/me/kyc', authenticate, async (req, res) => {
  try {
    const { documentType, documentNumber, documentImageUrl } = req.body;

    // Update KYC status
    await db.query(
      'UPDATE users SET kyc_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['PENDING', req.user.id]
    );

    // Here you would typically store the KYC documents in a separate table
    // For now, we'll just update the status

    res.json({ message: 'KYC documents submitted successfully' });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's listings
router.get('/:id/listings', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT l.*, COUNT(*) OVER() as total_count
      FROM listings l
      WHERE l.user_id = $1 AND l.status = 'ACTIVE'
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      listings: result.rows.map(row => {
        const { total_count, ...listing } = row;
        return listing;
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT r.*, u.first_name, u.last_name, u.profile_picture_url,
             l.title as listing_title,
             COUNT(*) OVER() as total_count
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.reviewed_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

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

module.exports = router;
