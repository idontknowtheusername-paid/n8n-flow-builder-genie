
const readline = require('readline');
const fs = require('fs');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const setup = async () => {
  console.log('🚀 Benome Backend Setup\n');

  // Check if .env already exists
  if (fs.existsSync('.env')) {
    const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📝 Let\'s configure your environment variables:\n');

  // Database
  const dbUrl = await question('Database URL (PostgreSQL): ') || 
    'postgresql://db_agent_ventes_user:ZSPMn6b02IEfWpESffxCYJpUUTan7pES@dpg-d0jt5hje5dus73b97v10-a.oregon-postgres.render.com:5432/db_agent_ventes';
  
  // JWT Secret
  const jwtSecret = await question('JWT Secret (leave empty to generate): ') || 
    crypto.randomBytes(64).toString('hex');

  // Frontend URL
  const frontendUrl = await question('Frontend URL: ') || 'http://localhost:5173';

  // Cloudinary
  console.log('\n🖼️  Cloudinary Configuration (for image uploads):');
  const cloudName = await question('Cloudinary Cloud Name: ');
  const cloudApiKey = await question('Cloudinary API Key: ');
  const cloudApiSecret = await question('Cloudinary API Secret: ');

  // Email
  console.log('\n📧 Email Configuration:');
  const smtpHost = await question('SMTP Host (default: smtp.gmail.com): ') || 'smtp.gmail.com';
  const smtpPort = await question('SMTP Port (default: 587): ') || '587';
  const smtpUser = await question('SMTP User (your email): ');
  const smtpPass = await question('SMTP Password (app password): ');

  // Stripe
  console.log('\n💳 Stripe Configuration:');
  const stripeKey = await question('Stripe Secret Key: ');
  const stripeWebhook = await question('Stripe Webhook Secret (optional): ');

  // PayPal
  console.log('\n💰 PayPal Configuration (optional):');
  const paypalClientId = await question('PayPal Client ID: ');
  const paypalSecret = await question('PayPal Client Secret: ');
  const paypalMode = await question('PayPal Mode (sandbox/live, default: sandbox): ') || 'sandbox';

  // Generate .env file
  const envContent = `# Database
DATABASE_URL=${dbUrl}

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# Cloudinary for file upload
CLOUDINARY_CLOUD_NAME=${cloudName}
CLOUDINARY_API_KEY=${cloudApiKey}
CLOUDINARY_API_SECRET=${cloudApiSecret}

# Email
SMTP_HOST=${smtpHost}
SMTP_PORT=${smtpPort}
SMTP_USER=${smtpUser}
SMTP_PASS=${smtpPass}

# Payment Gateways
STRIPE_SECRET_KEY=${stripeKey}
STRIPE_WEBHOOK_SECRET=${stripeWebhook}

PAYPAL_CLIENT_ID=${paypalClientId}
PAYPAL_CLIENT_SECRET=${paypalSecret}
PAYPAL_MODE=${paypalMode}

# PayDunya (configure when needed)
PAYDUNYA_MASTER_KEY=your_paydunya_master_key
PAYDUNYA_PRIVATE_KEY=your_paydunya_private_key
PAYDUNYA_TOKEN=your_paydunya_token

# Frontend URL
FRONTEND_URL=${frontendUrl}
`;

  fs.writeFileSync('.env', envContent);

  console.log('\n✅ .env file created successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Review and edit .env file if needed');
  console.log('2. Run: npm install');
  console.log('3. Run: npm run migrate');
  console.log('4. Run: npm run seed (optional)');
  console.log('5. Run: npm run dev');
  console.log('\n🌐 Your API will be available at http://localhost:3000');

  rl.close();
};

if (require.main === module) {
  setup().catch(console.error);
}

module.exports = setup;
