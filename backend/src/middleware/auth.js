const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user information to requests
 * following constitutional security requirements.
 */

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
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
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Find the user and verify session
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Verify session ID matches (prevents token reuse after logout)
    if (user.sessionId !== decoded.sessionId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_INVALID',
          message: 'Session has been invalidated'
        }
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    }
    
    next(error);
  }
};

/**
 * Middleware to check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = async (req, res, next) => {
  try {
    // First authenticate the token
    await authenticateToken(req, res, () => {});
    
    // Check if user has admin privileges
    // TODO: Implement admin role checking once Admin model is created
    const isAdmin = req.user.email === process.env.ADMIN_EMAIL || 
                    req.user.profile?.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin privileges required'
        }
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token provided, continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    const user = await User.findById(decoded.id);
    if (user && user.sessionId === decoded.sessionId) {
      req.user = user;
      req.userId = user._id;
    }
    
    next();
  } catch (error) {
    // If token is invalid, continue without user (don't throw error)
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};