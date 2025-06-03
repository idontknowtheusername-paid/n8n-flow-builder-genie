
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { createRateLimit } = require('../utils/helpers');

// Basic rate limiting
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
});

// Speed limiter (slow down requests)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: 500 // add 500ms delay per request after delayAfter
});

// Custom rate limiter for uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 uploads per hour
  message: {
    error: 'Upload limit exceeded, please try again later.'
  }
});

// Request size limiter
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']);
    const maxBytes = typeof maxSize === 'string' 
      ? parseInt(maxSize) * 1024 * 1024 
      : maxSize;

    if (contentLength && contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Request too large'
      });
    }
    next();
  };
};

// IP whitelist middleware
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) return next();
    
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: 'IP not allowed'
      });
    }
    next();
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for malicious patterns
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /eval\(/gi,
    /document\.cookie/gi
  ];

  const checkString = (str) => {
    return maliciousPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && checkString(obj[key])) {
        return true;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) return true;
      }
    }
    return false;
  };

  // Check query parameters
  if (checkObject(req.query)) {
    return res.status(400).json({ error: 'Malicious content detected in query' });
  }

  // Check request body
  if (req.body && checkObject(req.body)) {
    return res.status(400).json({ error: 'Malicious content detected in body' });
  }

  next();
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080'
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  basicLimiter,
  authLimiter,
  speedLimiter,
  uploadLimiter,
  requestSizeLimiter,
  ipWhitelist,
  securityHeaders,
  validateRequest,
  corsOptions
};
