
const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      usersCount,
      listingsCount,
      activeListingsCount,
      pendingListingsCount,
      transactionsCount,
      revenueSum
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM listings'),
      db.query('SELECT COUNT(*) FROM listings WHERE status = $1', ['ACTIVE']),
      db.query('SELECT COUNT(*) FROM listings WHERE status = $1', ['PENDING_APPROVAL']),
      db.query('SELECT COUNT(*) FROM transactions'),
      db.query('SELECT SUM(amount) FROM transactions WHERE status = $1', ['PAID'])
    ]);

    res.json({
      stats: {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalListings: parseInt(listingsCount.rows[0].count),
        activeListings: parseInt(activeListingsCount.rows[0].count),
        pendingListings: parseInt(pendingListingsCount.rows[0].count),
        totalTransactions: parseInt(transactionsCount.rows[0].count),
        totalRevenue: parseFloat(revenueSum.rows[0].sum || 0)
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all listings for approval
router.get('/listings', async (req, res) => {
  try {
    const { status = 'PENDING_APPROVAL', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT l.*, u.first_name, u.last_name, u.email,
             COUNT(*) OVER() as total_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = $1
      ORDER BY l.created_at ASC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);

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
    console.error('Admin get listings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve listing
router.put('/listings/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE listings SET status = $1, published_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING user_id',
      ['ACTIVE', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Create notification for user
    await db.query(`
      INSERT INTO notifications (user_id, type, title, content, link)
      VALUES ($1, 'LISTING_APPROVED', 'Listing Approved', 
              'Your listing has been approved and is now live', '/listings/${id}')
    `, [result.rows[0].user_id]);

    res.json({ message: 'Listing approved successfully' });
  } catch (error) {
    console.error('Admin approve listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject listing
router.put('/listings/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await db.query(
      'UPDATE listings SET status = $1 WHERE id = $2 RETURNING user_id',
      ['REJECTED', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Create notification for user
    await db.query(`
      INSERT INTO notifications (user_id, type, title, content, link)
      VALUES ($1, 'LISTING_REJECTED', 'Listing Rejected', $2, '/listings/${id}')
    `, [result.rows[0].user_id, reason || 'Your listing has been rejected']);

    res.json({ message: 'Listing rejected successfully' });
  } catch (error) {
    console.error('Admin reject listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number,
             u.kyc_status, u.roles, u.created_at, u.last_login_at,
             COUNT(l.id) as listings_count,
             COUNT(*) OVER() as total_count
      FROM users u
      LEFT JOIN listings l ON u.id = l.user_id AND l.status != 'DELETED'
    `;
    
    let params = [];
    let paramCount = 0;

    if (search) {
      query += ` WHERE (u.first_name ILIKE $${++paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      users: result.rows.map(row => {
        const { total_count, ...user } = row;
        return user;
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'activate', 'deactivate', 'promote', 'demote'

    let updateQuery;
    let params = [id];

    switch (action) {
      case 'activate':
        // For now, we don't have an active/inactive status field
        // This could be implemented with an 'is_active' boolean field
        return res.status(400).json({ message: 'User activation not implemented' });
      
      case 'promote':
        updateQuery = `UPDATE users SET roles = array_append(roles, 'ADMIN') WHERE id = $1 AND NOT ('ADMIN' = ANY(roles))`;
        break;
      
      case 'demote':
        updateQuery = `UPDATE users SET roles = array_remove(roles, 'ADMIN') WHERE id = $1`;
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    await db.query(updateQuery, params);
    res.json({ message: `User ${action}d successfully` });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transactions
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, l.title as listing_title,
             ub.first_name as buyer_first_name, ub.last_name as buyer_last_name,
             us.first_name as seller_first_name, us.last_name as seller_last_name,
             COUNT(*) OVER() as total_count
      FROM transactions t
      JOIN listings l ON t.listing_id = l.id
      LEFT JOIN users ub ON t.buyer_id = ub.id
      LEFT JOIN users us ON t.seller_id = us.id
    `;

    let params = [];
    let paramCount = 0;

    if (status) {
      query += ` WHERE t.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      transactions: result.rows.map(row => {
        const { total_count, ...transaction } = row;
        return transaction;
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });
  } catch (error) {
    console.error('Admin get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
