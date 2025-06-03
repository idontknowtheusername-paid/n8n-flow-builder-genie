
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate UUID v4
const generateUUID = () => {
  return crypto.randomUUID();
};

// Hash password reset token
const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate JWT token
const generateJWT = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Verify JWT token
const verifyJWT = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Sanitize string for search
const sanitizeSearchTerm = (term) => {
  if (!term) return '';
  return term.trim().replace(/[<>]/g, '');
};

// Calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Format currency
const formatCurrency = (amount, currency = 'XOF') => {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  });
  return formatter.format(amount);
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (basic)
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Slugify string
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Paginate array
const paginate = (array, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);
  
  return {
    data: paginatedItems,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(array.length / limit),
      totalCount: array.length,
      hasNextPage: page < Math.ceil(array.length / limit),
      hasPrevPage: page > 1
    }
  };
};

// Escape HTML
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Generate random color for avatar
const generateAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Rate limiting helper
const createRateLimit = (windowMs, max) => {
  const requests = new Map();
  
  return (identifier) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, timestamps] of requests.entries()) {
      requests.set(key, timestamps.filter(time => time > windowStart));
      if (requests.get(key).length === 0) {
        requests.delete(key);
      }
    }
    
    const userRequests = requests.get(identifier) || [];
    if (userRequests.length >= max) {
      return false;
    }
    
    userRequests.push(now);
    requests.set(identifier, userRequests);
    return true;
  };
};

module.exports = {
  generateRandomString,
  generateUUID,
  hashResetToken,
  generateJWT,
  verifyJWT,
  sanitizeSearchTerm,
  calculateDistance,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  slugify,
  paginate,
  escapeHtml,
  generateAvatarColor,
  debounce,
  createRateLimit
};
