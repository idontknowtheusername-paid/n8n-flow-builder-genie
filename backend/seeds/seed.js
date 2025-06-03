
const db = require('../config/database');

const seedData = async () => {
  try {
    console.log('Seeding database...');

    // Insert sample categories
    const categories = [
      { name: 'Immobilier', slug: 'immobilier', icon: 'home' },
      { name: 'Automobile', slug: 'automobile', icon: 'car' },
      { name: 'Services', slug: 'services', icon: 'briefcase' },
      { name: 'Marketplace', slug: 'marketplace', icon: 'shopping-bag' }
    ];

    for (const category of categories) {
      await db.query(
        'INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
        [category.name, category.slug, category.icon]
      );
    }

    console.log('Sample categories inserted');

    // Insert subcategories for Real Estate
    const realEstateSubcategories = [
      { name: 'Appartements', slug: 'appartements', parent_slug: 'immobilier' },
      { name: 'Maisons', slug: 'maisons', parent_slug: 'immobilier' },
      { name: 'Terrains', slug: 'terrains', parent_slug: 'immobilier' },
      { name: 'Commercial', slug: 'commercial', parent_slug: 'immobilier' }
    ];

    for (const subcat of realEstateSubcategories) {
      const parentResult = await db.query('SELECT id FROM categories WHERE slug = $1', [subcat.parent_slug]);
      if (parentResult.rows.length > 0) {
        await db.query(
          'INSERT INTO categories (name, slug, parent_id) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
          [subcat.name, subcat.slug, parentResult.rows[0].id]
        );
      }
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = { seedData };
