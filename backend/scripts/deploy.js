
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const deploy = () => {
  console.log('🚀 Starting deployment process...');

  try {
    // Check if .env file exists
    if (!fs.existsSync('.env')) {
      console.error('❌ .env file not found. Please create one based on .env.example');
      process.exit(1);
    }

    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    // Run database migrations
    console.log('🗄️  Running database migrations...');
    execSync('npm run migrate', { stdio: 'inherit' });

    // Run seeds (optional)
    if (process.argv.includes('--seed')) {
      console.log('🌱 Running database seeds...');
      execSync('npm run seed', { stdio: 'inherit' });
    }

    // Build if needed (for TypeScript projects)
    if (fs.existsSync('tsconfig.json')) {
      console.log('🔨 Building TypeScript...');
      execSync('npm run build', { stdio: 'inherit' });
    }

    console.log('✅ Deployment completed successfully!');
    console.log('🌐 Your API is ready to serve requests');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
};

// Run deployment
if (require.main === module) {
  deploy();
}

module.exports = deploy;
