
const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all categories with subcategories
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c1.id, c1.name, c1.slug, c1.icon,
             json_agg(
               json_build_object(
                 'id', c2.id,
                 'name', c2.name,
                 'slug', c2.slug
               )
             ) FILTER (WHERE c2.id IS NOT NULL) as subcategories
      FROM categories c1
      LEFT JOIN categories c2 ON c1.id = c2.parent_id
      WHERE c1.parent_id IS NULL
      GROUP BY c1.id, c1.name, c1.slug, c1.icon
      ORDER BY c1.name
    `);

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get category by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await db.query(`
      SELECT c1.*, 
             json_agg(
               json_build_object(
                 'id', c2.id,
                 'name', c2.name,
                 'slug', c2.slug
               )
             ) FILTER (WHERE c2.id IS NOT NULL) as subcategories
      FROM categories c1
      LEFT JOIN categories c2 ON c1.id = c2.parent_id
      WHERE c1.slug = $1
      GROUP BY c1.id
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get listings count by category
router.get('/stats/counts', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        l.category,
        l.sub_category,
        COUNT(*) as count
      FROM listings l
      WHERE l.status = 'ACTIVE'
      GROUP BY l.category, l.sub_category
      ORDER BY l.category, count DESC
    `);

    const stats = result.rows.reduce((acc, row) => {
      if (!acc[row.category]) {
        acc[row.category] = { total: 0, subcategories: {} };
      }
      acc[row.category].total += parseInt(row.count);
      if (row.sub_category) {
        acc[row.category].subcategories[row.sub_category] = parseInt(row.count);
      }
      return acc;
    }, {});

    res.json({ stats });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
