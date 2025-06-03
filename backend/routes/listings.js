
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all listings with filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('category').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('location').optional().isString(),
  query('sortBy').optional().isIn(['price', 'created_at', 'view_count']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      category,
      subCategory,
      minPrice,
      maxPrice,
      location,
      sortBy = 'created_at',
      sortOrder = 'desc',
      q
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['status = $1'];
    let params = ['ACTIVE'];
    let paramCount = 1;

    if (category) {
      whereConditions.push(`category = $${++paramCount}`);
      params.push(category);
    }

    if (subCategory) {
      whereConditions.push(`sub_category = $${++paramCount}`);
      params.push(subCategory);
    }

    if (minPrice) {
      whereConditions.push(`price >= $${++paramCount}`);
      params.push(minPrice);
    }

    if (maxPrice) {
      whereConditions.push(`price <= $${++paramCount}`);
      params.push(maxPrice);
    }

    if (location) {
      whereConditions.push(`location->>'city' ILIKE $${++paramCount}`);
      params.push(`%${location}%`);
    }

    if (q) {
      whereConditions.push(`(title ILIKE $${++paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${q}%`);
    }

    const whereClause = whereConditions.join(' AND ');
    
    const query = `
      SELECT l.*, 
             u.first_name, u.last_name, u.profile_picture_url,
             COUNT(*) OVER() as total_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      listings: result.rows.map(row => {
        const { total_count, ...listing } = row;
        return listing;
      }),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single listing
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    await db.query(
      'UPDATE listings SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    const result = await db.query(`
      SELECT l.*, 
             u.first_name, u.last_name, u.profile_picture_url, u.email, u.phone_number
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1 AND l.status = 'ACTIVE'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const listing = result.rows[0];

    // Get category-specific details
    let specificDetails = {};
    switch (listing.category) {
      case 'REAL_ESTATE':
        const realEstateResult = await db.query(
          'SELECT * FROM real_estate_listings WHERE listing_id = $1',
          [id]
        );
        if (realEstateResult.rows.length > 0) {
          specificDetails = realEstateResult.rows[0];
        }
        break;
      case 'AUTOMOBILE':
        const autoResult = await db.query(
          'SELECT * FROM automobile_listings WHERE listing_id = $1',
          [id]
        );
        if (autoResult.rows.length > 0) {
          specificDetails = autoResult.rows[0];
        }
        break;
      case 'SERVICE':
        const serviceResult = await db.query(
          'SELECT * FROM service_listings WHERE listing_id = $1',
          [id]
        );
        if (serviceResult.rows.length > 0) {
          specificDetails = serviceResult.rows[0];
        }
        break;
      case 'PRODUCT':
        const productResult = await db.query(
          'SELECT * FROM product_listings WHERE listing_id = $1',
          [id]
        );
        if (productResult.rows.length > 0) {
          specificDetails = productResult.rows[0];
        }
        break;
    }

    res.json({ ...listing, specificDetails });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create listing
router.post('/', authenticate, [
  body('title').trim().isLength({ min: 5, max: 255 }),
  body('description').trim().isLength({ min: 10 }),
  body('price').isFloat({ min: 0 }),
  body('category').isIn(['REAL_ESTATE', 'AUTOMOBILE', 'SERVICE', 'PRODUCT']),
  body('location.city').optional().isString(),
  body('location.country').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      price,
      currency = 'XOF',
      category,
      subCategory,
      location,
      images = [],
      videos = [],
      specificData = {}
    } = req.body;

    // Create listing
    const result = await db.query(`
      INSERT INTO listings (user_id, title, description, price, currency, category, 
                          sub_category, location, images, videos, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING_APPROVAL')
      RETURNING *
    `, [req.user.id, title, description, price, currency, category, subCategory, 
        JSON.stringify(location), images, videos]);

    const listing = result.rows[0];

    // Add category-specific data
    switch (category) {
      case 'REAL_ESTATE':
        if (specificData.propertyType && specificData.transactionType) {
          await db.query(`
            INSERT INTO real_estate_listings (listing_id, property_type, transaction_type,
                                            bedrooms, bathrooms, area_sq_meters, amenities,
                                            construction_year, has_360_tour, virtual_tour_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [listing.id, specificData.propertyType, specificData.transactionType,
              specificData.bedrooms, specificData.bathrooms, specificData.areaSqMeters,
              specificData.amenities, specificData.constructionYear, 
              specificData.has360Tour, specificData.virtualTourUrl]);
        }
        break;
      case 'AUTOMOBILE':
        if (specificData.vehicleType) {
          await db.query(`
            INSERT INTO automobile_listings (listing_id, vehicle_type, make, model, year,
                                           mileage, fuel_type, transmission_type, condition,
                                           vin_number, has_virtual_inspection)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [listing.id, specificData.vehicleType, specificData.make, specificData.model,
              specificData.year, specificData.mileage, specificData.fuelType,
              specificData.transmissionType, specificData.condition,
              specificData.vinNumber, specificData.hasVirtualInspection]);
        }
        break;
      case 'SERVICE':
        await db.query(`
          INSERT INTO service_listings (listing_id, service_category, availability,
                                      experience_years, portfolio_links, can_provide_quotes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [listing.id, specificData.serviceCategory, specificData.availability,
            specificData.experienceYears, specificData.portfolioLinks,
            specificData.canProvideQuotes]);
        break;
      case 'PRODUCT':
        await db.query(`
          INSERT INTO product_listings (listing_id, product_category, condition, brand,
                                      stock_quantity, shipping_options)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [listing.id, specificData.productCategory, specificData.condition,
            specificData.brand, specificData.stockQuantity, specificData.shippingOptions]);
        break;
    }

    res.status(201).json({ 
      message: 'Listing created successfully',
      listing 
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update listing
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user owns the listing
    const checkResult = await db.query(
      'SELECT user_id FROM listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title,
      description,
      price,
      currency,
      subCategory,
      location,
      images,
      videos
    } = req.body;

    const result = await db.query(`
      UPDATE listings 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          currency = COALESCE($4, currency),
          sub_category = COALESCE($5, sub_category),
          location = COALESCE($6, location),
          images = COALESCE($7, images),
          videos = COALESCE($8, videos),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [title, description, price, currency, subCategory, 
        location ? JSON.stringify(location) : null, images, videos, id]);

    res.json({
      message: 'Listing updated successfully',
      listing: result.rows[0]
    });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete listing
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user owns the listing or is admin
    const checkResult = await db.query(
      'SELECT user_id FROM listings WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const isOwner = checkResult.rows[0].user_id === req.user.id;
    const isAdmin = req.user.roles && req.user.roles.includes('ADMIN');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.query('UPDATE listings SET status = $1 WHERE id = $2', ['DELETED', id]);

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's listings
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT l.*, COUNT(*) OVER() as total_count
      FROM listings l
      WHERE l.user_id = $1 AND l.status != 'DELETED'
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      listings: result.rows.map(row => {
        const { total_count, ...listing } = row;
        return listing;
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
