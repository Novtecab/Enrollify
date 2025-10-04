const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Authentication Service
 * 
 * Handles JWT token generation, validation, refresh, and session management
 * following constitutional security requirements and best practices.
 * 
 * Constitutional Requirements:
 * - Secure token generation and validation
 * - Session management with rotation
 * - Rate limiting considerations
 * - Comprehensive error handling
 */

class AuthService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    // Validate required environment variables
    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets are required in environment variables');
    }
  }

  /**
   * Generate access and refresh tokens for a user
   * @param {Object} user - User document
   * @param {boolean} rememberMe - Extended session flag
   * @returns {Object} Token pair with metadata
   */
  generateTokens(user, rememberMe = false) {
    const payload = {
      id: user._id,
      email: user.email,
      sessionId: user.sessionId,
      type: user.constructor.modelName.toLowerCase() // 'user' or 'admin'
    };

    // Generate access token
    const accessToken = jwt.sign(
      payload,
      this.accessTokenSecret,
      { 
        expiresIn: this.accessTokenExpiry,
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-users'
      }
    );

    // Generate refresh token with extended expiry if remember me is enabled
    const refreshExpiry = rememberMe ? '30d' : this.refreshTokenExpiry;
    const refreshToken = jwt.sign(
      { ...payload, tokenType: 'refresh' },
      this.refreshTokenSecret,
      { 
        expiresIn: refreshExpiry,
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-users'
      }
    );

    // Calculate expiry time in seconds for frontend
    const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify and decode access token
   * @param {string} token - JWT access token
   * @returns {Object} Decoded token payload
   * @throws {Error} Token validation errors
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_ACCESS_TOKEN');
      } else {
        throw new Error('TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Verify and decode refresh token
   * @param {string} token - JWT refresh token
   * @returns {Object} Decoded token payload
   * @throws {Error} Token validation errors
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-users'
      });

      if (decoded.tokenType !== 'refresh') {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_REFRESH_TOKEN');
      } else {
        throw new Error('TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Object} New token pair
   * @throws {Error} Refresh validation errors
   */
  async refreshTokens(refreshToken) {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Find user and validate session
    const UserModel = decoded.type === 'admin' ? Admin : User;
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.sessionId !== decoded.sessionId) {
      throw new Error('SESSION_INVALID');
    }

    // Generate new session ID for security
    user.generateSessionId();
    await user.save();

    // Generate new token pair
    return this.generateTokens(user);
  }

  /**
   * Revoke user session (logout)
   * @param {string} userId - User ID
   * @param {string} userType - 'user' or 'admin'
   * @returns {boolean} Success status
   */
  async revokeSession(userId, userType = 'user') {
    try {
      const UserModel = userType === 'admin' ? Admin : User;
      const user = await UserModel.findById(userId);

      if (user) {
        user.sessionId = undefined;
        await user.save();
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random session ID
   * @returns {string} Random session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate password reset token
   * @param {Object} user - User document
   * @returns {string} Reset token
   */
  generateResetToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      purpose: 'password_reset',
      timestamp: Date.now()
    };

    return jwt.sign(
      payload,
      this.accessTokenSecret,
      { 
        expiresIn: '1h', // Reset tokens expire in 1 hour
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-reset'
      }
    );
  }

  /**
   * Verify password reset token
   * @param {string} token - Reset token
   * @returns {Object} Decoded token payload
   * @throws {Error} Token validation errors
   */
  verifyResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-reset'
      });

      if (decoded.purpose !== 'password_reset') {
        throw new Error('INVALID_RESET_TOKEN');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('RESET_TOKEN_EXPIRED');
      } else {
        throw new Error('INVALID_RESET_TOKEN');
      }
    }
  }

  /**
   * Generate email verification token
   * @param {Object} user - User document
   * @returns {string} Verification token
   */
  generateVerificationToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      purpose: 'email_verification',
      timestamp: Date.now()
    };

    return jwt.sign(
      payload,
      this.accessTokenSecret,
      { 
        expiresIn: '24h', // Verification tokens expire in 24 hours
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-verify'
      }
    );
  }

  /**
   * Verify email verification token
   * @param {string} token - Verification token
   * @returns {Object} Decoded token payload
   * @throws {Error} Token validation errors
   */
  verifyVerificationToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-verify'
      });

      if (decoded.purpose !== 'email_verification') {
        throw new Error('INVALID_VERIFICATION_TOKEN');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('VERIFICATION_TOKEN_EXPIRED');
      } else {
        throw new Error('INVALID_VERIFICATION_TOKEN');
      }
    }
  }

  /**
   * Generate secure API key for external integrations
   * @param {Object} user - User document
   * @param {string} purpose - API key purpose
   * @returns {string} API key
   */
  generateApiKey(user, purpose = 'general') {
    const payload = {
      id: user._id,
      purpose,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex')
    };

    return jwt.sign(
      payload,
      this.accessTokenSecret,
      { 
        expiresIn: '1y', // API keys expire in 1 year
        issuer: 'uniapply-hub',
        audience: 'uniapply-hub-api'
      }
    );
  }

  /**
   * Parse JWT expiry string to seconds
   * @param {string} expiry - Expiry string (e.g., '15m', '1h', '7d')
   * @returns {number} Expiry in seconds
   */
  parseExpiryToSeconds(expiry) {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900; // Default to 15 minutes
    }
  }

  /**
   * Validate token strength and format
   * @param {string} token - JWT token
   * @returns {boolean} Validation result
   */
  validateTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64url encoded
    for (const part of parts) {
      if (!/^[A-Za-z0-9_-]+$/.test(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get token payload without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null
   */
  decodeTokenUnsafe(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is close to expiry
   * @param {string} token - JWT token
   * @param {number} bufferMinutes - Minutes before expiry to consider "close"
   * @returns {boolean} True if token expires soon
   */
  isTokenCloseToExpiry(token, bufferMinutes = 5) {
    try {
      const decoded = this.decodeTokenUnsafe(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const bufferTime = bufferMinutes * 60 * 1000;
      const currentTime = Date.now();

      return (expiryTime - currentTime) <= bufferTime;
    } catch (error) {
      return true;
    }
  }
}

// Export singleton instance
const authService = new AuthService();

module.exports = authService;