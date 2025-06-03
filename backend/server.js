
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./config/database');
const socketHandler = require('./sockets/socketHandler');
const errorHandler = require('./middleware/errorHandler');
const { securityHeaders, corsOptions, basicLimiter } = require('./middleware/security');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const listingRoutes = require('./routes/listings');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const categoryRoutes = require('./routes/categories');
const reviewRoutes = require('./routes/reviews');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Make io globally available
global.io = io;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(securityHeaders);
app.use(compression());
app.use(morgan('combined'));
app.use(cors(corsOptions));

// Rate limiting
app.use(basicLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.io
socketHandler(io);
app.set('io', io);

// Health check (before rate limiting)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    name: 'Benome API',
    version: '1.0.0',
    description: 'API for Benome Marketplace',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      listings: '/api/listings',
      messages: '/api/messages',
      payments: '/api/payments',
      admin: '/api/admin',
      upload: '/api/upload',
      notifications: '/api/notifications',
      categories: '/api/categories',
      reviews: '/api/reviews'
    },
    documentation: 'https://docs.benome.com'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    availableRoutes: [
      'GET /health',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/listings',
      'GET /api/categories'
    ]
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: Connected`);
  console.log(`🔌 Socket.IO: Enabled`);
  console.log(`📡 API Documentation: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
