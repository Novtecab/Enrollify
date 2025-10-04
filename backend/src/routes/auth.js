const express = require('express');
const { body, validationResult } = require('express-validator');
const userService = require('../services/userService');
const authService = require('../services/authService');
const emailService = require('../services/emailService');

/**
 * Authentication Routes
 * 
 * Handles user registration, login, token refresh, and password reset
 * following constitutional security and validation requirements.
 */

const router = express.Router();

// Helper to format service errors for API response
const formatServiceError = (error) => {
  if (error.code === 'VALIDATION_ERROR') {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || error.validationErrors || []
      }
    };
  }

  return {
    success: false,
    error: {
      code: error.code || 'SERVICE_ERROR',
      message: error.message || 'An error occurred'
    }
  };
};

// User registration validation
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, uppercase letter, and number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('acceptTerms')
    .isBoolean()
    .custom(value => value === true)
    .withMessage('You must accept the terms and conditions')
];

// User login validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        }
      });
    }

    // Use user service to create account
    const result = await userService.createUser(req.body);

    // Send welcome email (don't wait for completion)
    if (emailService.isReady()) {
      const verificationToken = authService.generateVerificationToken(result.user);
      emailService.sendWelcomeEmail(result.user, verificationToken)
        .catch(error => console.error('Welcome email failed:', error.message));
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.profile.personalInfo.firstName,
        lastName: result.user.profile.personalInfo.lastName,
        profileCompletion: result.user.profileCompletionStatus.overallCompletion,
        createdAt: result.user.createdAt,
        lastLoginAt: result.user.lastLoginAt
      },
      tokens: result.tokens
    });

  } catch (error) {
    if (error.code) {
      return res.status(error.code === 'VALIDATION_ERROR' ? 400 : 409).json(formatServiceError(error));
    }
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        }
      });
    }

    // Use user service to authenticate
    const result = await userService.authenticateUser(req.body);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.profile.personalInfo.firstName,
        lastName: result.user.profile.personalInfo.lastName,
        profileCompletion: result.user.profileCompletionStatus.overallCompletion,
        lastLoginAt: result.user.lastLoginAt,
        createdAt: result.user.createdAt
      },
      tokens: result.tokens
    });

  } catch (error) {
    if (error.code) {
      return res.status(401).json(formatServiceError(error));
    }
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required'
        }
      });
    }

    // Use auth service to refresh tokens
    const tokens = await authService.refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      tokens
    });

  } catch (error) {
    if (error.message.includes('TOKEN') || error.message.includes('USER') || error.message.includes('SESSION')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required'
        }
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Find user and clear session
    const user = await User.findById(decoded.id);
    if (user) {
      user.sessionId = undefined;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email address is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        }
      });
    }

    const { email } = req.body;
    const user = await User.findByEmail(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset email has been sent'
    });

    // TODO: Implement actual email sending logic
    if (user) {
      console.log(`Password reset requested for user: ${user.email}`);
      // Generate reset token and send email
    }

  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, uppercase letter, and number')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        }
      });
    }

    // TODO: Implement password reset token verification and password update
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;