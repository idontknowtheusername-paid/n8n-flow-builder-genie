
const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const userValidation = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number required'),
    handleValidationErrors
  ],
  
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],

  updateProfile: [
    body('firstName').optional().trim().isLength({ min: 2 }),
    body('lastName').optional().trim().isLength({ min: 2 }),
    body('phoneNumber').optional().isMobilePhone(),
    body('preferredLanguage').optional().isIn(['fr', 'en']),
    body('currency').optional().isIn(['XOF', 'USD', 'EUR']),
    handleValidationErrors
  ]
};

// Listing validation rules
const listingValidation = {
  create: [
    body('title').trim().isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isIn(['REAL_ESTATE', 'AUTOMOBILE', 'SERVICE', 'PRODUCT']).withMessage('Invalid category'),
    body('currency').optional().isIn(['XOF', 'USD', 'EUR']),
    body('location.city').optional().isString(),
    body('location.country').optional().isString(),
    body('images').optional().isArray(),
    body('videos').optional().isArray(),
    handleValidationErrors
  ],

  update: [
    param('id').isUUID().withMessage('Invalid listing ID'),
    body('title').optional().trim().isLength({ min: 5, max: 255 }),
    body('description').optional().trim().isLength({ min: 10 }),
    body('price').optional().isFloat({ min: 0 }),
    handleValidationErrors
  ]
};

// Message validation rules
const messageValidation = {
  send: [
    param('conversationId').isUUID().withMessage('Invalid conversation ID'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message content is required and must be less than 2000 characters'),
    body('attachmentUrl').optional().isURL(),
    handleValidationErrors
  ],

  createConversation: [
    body('participantId').isUUID().withMessage('Invalid participant ID'),
    body('listingId').optional().isUUID(),
    body('initialMessage').trim().isLength({ min: 1, max: 2000 }),
    handleValidationErrors
  ]
};

// Common validation rules
const commonValidation = {
  uuidParam: (paramName) => [
    param(paramName).isUUID().withMessage(`Invalid ${paramName}`),
    handleValidationErrors
  ],

  pagination: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidationErrors
  ]
};

module.exports = {
  userValidation,
  listingValidation,
  messageValidation,
  commonValidation,
  handleValidationErrors
};
