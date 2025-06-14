const db = require('../config/database');

const migrations = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    profile_picture_url TEXT,
    address JSONB,
    kyc_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED',
    roles VARCHAR(20)[] DEFAULT ARRAY['USER'],
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    preferred_language VARCHAR(5) DEFAULT 'fr',
    currency VARCHAR(3) DEFAULT 'XOF',
    is_online BOOLEAN DEFAULT false,
    stripe_customer_id VARCHAR(100),
    paypal_payer_id VARCHAR(100),
    paydunya_customer_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Categories table
  `CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id),
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Listings table
  `CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    category VARCHAR(50) NOT NULL,
    sub_category VARCHAR(100),
    location JSONB,
    images TEXT[],
    videos TEXT[],
    status VARCHAR(20) DEFAULT 'DRAFT',
    is_featured BOOLEAN DEFAULT false,
    boost_package VARCHAR(20),
    boost_expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    expires_at TIMESTAMP
  );`,

  // Real Estate specific fields
  `CREATE TABLE IF NOT EXISTS real_estate_listings (
    listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    property_type VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sq_meters DECIMAL(10,2),
    amenities TEXT[],
    construction_year INTEGER,
    has_360_tour BOOLEAN DEFAULT false,
    virtual_tour_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Automobile specific fields
  `CREATE TABLE IF NOT EXISTS automobile_listings (
    listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    mileage INTEGER,
    fuel_type VARCHAR(50),
    transmission_type VARCHAR(50),
    condition VARCHAR(20),
    vin_number VARCHAR(100),
    has_virtual_inspection BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Service specific fields
  `CREATE TABLE IF NOT EXISTS service_listings (
    listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    service_category VARCHAR(100),
    availability TEXT,
    experience_years INTEGER,
    portfolio_links TEXT[],
    can_provide_quotes BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Product specific fields
  `CREATE TABLE IF NOT EXISTS product_listings (
    listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    product_category VARCHAR(100),
    condition VARCHAR(20),
    brand VARCHAR(100),
    stock_quantity INTEGER DEFAULT 1,
    shipping_options TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Conversations table
  `CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL REFERENCES users(id),
    participant2_id UUID NOT NULL REFERENCES users(id),
    listing_id UUID REFERENCES listings(id),
    last_message_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Messages table
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Transactions table
  `CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    payment_gateway VARCHAR(20) NOT NULL,
    payment_gateway_transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING',
    escrow_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Reviews table
  `CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    reviewed_user_id UUID REFERENCES users(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Notifications table
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING gin(location);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`,
];

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    for (const migration of migrations) {
      await db.query(migration);
    }
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
