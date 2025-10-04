const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Password Service
 * 
 * Handles password hashing, validation, strength checking, and secure
 * password generation following constitutional security requirements.
 * 
 * Constitutional Requirements:
 * - Strong password hashing with bcrypt
 * - Password strength validation
 * - Secure random password generation
 * - Rate limiting considerations
 */

class PasswordService {
  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.minPasswordLength = 8;
    this.maxPasswordLength = 128;
    
    // Password complexity requirements
    this.requirements = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false, // Optional for better UX
      forbiddenPatterns: [
        /(.)\1{3,}/, // No more than 3 consecutive identical characters
        /123456|654321|password|qwerty/i, // Common weak patterns
      ]
    };
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   * @throws {Error} Hashing errors
   */
  async hashPassword(password) {
    try {
      if (!password) {
        throw new Error('Password is required');
      }

      if (typeof password !== 'string') {
        throw new Error('Password must be a string');
      }

      if (password.length > this.maxPasswordLength) {
        throw new Error(`Password must not exceed ${this.maxPasswordLength} characters`);
      }

      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Verification result
   * @throws {Error} Verification errors
   */
  async verifyPassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }

      if (typeof password !== 'string' || typeof hash !== 'string') {
        return false;
      }

      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Log error but don't throw to prevent information leakage
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @param {Object} userInfo - User information for context checks
   * @returns {Object} Validation result with score and feedback
   */
  validatePasswordStrength(password, userInfo = {}) {
    const result = {
      isValid: false,
      score: 0,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!password) {
      result.errors.push('Password is required');
      return result;
    }

    if (typeof password !== 'string') {
      result.errors.push('Password must be a string');
      return result;
    }

    // Length validation
    if (password.length < this.requirements.minLength) {
      result.errors.push(`Password must be at least ${this.requirements.minLength} characters long`);
    } else if (password.length >= this.requirements.minLength) {
      result.score += 20;
    }

    if (password.length > this.requirements.maxLength) {
      result.errors.push(`Password must not exceed ${this.requirements.maxLength} characters`);
    }

    // Character type requirements
    if (this.requirements.requireUppercase && !/[A-Z]/.test(password)) {
      result.errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      result.score += 15;
    }

    if (this.requirements.requireLowercase && !/[a-z]/.test(password)) {
      result.errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      result.score += 15;
    }

    if (this.requirements.requireNumbers && !/\d/.test(password)) {
      result.errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      result.score += 15;
    }

    if (this.requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.errors.push('Password must contain at least one special character');
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.score += 10;
    }

    // Pattern validation
    for (const pattern of this.requirements.forbiddenPatterns) {
      if (pattern.test(password)) {
        result.errors.push('Password contains forbidden patterns or is too common');
        break;
      }
    }

    // Context-based validation
    if (userInfo.email && password.toLowerCase().includes(userInfo.email.split('@')[0].toLowerCase())) {
      result.warnings.push('Password should not contain parts of your email address');
      result.score -= 10;
    }

    if (userInfo.firstName && password.toLowerCase().includes(userInfo.firstName.toLowerCase())) {
      result.warnings.push('Password should not contain your first name');
      result.score -= 5;
    }

    if (userInfo.lastName && password.toLowerCase().includes(userInfo.lastName.toLowerCase())) {
      result.warnings.push('Password should not contain your last name');
      result.score -= 5;
    }

    // Length bonus
    if (password.length >= 12) {
      result.score += 10;
    }
    if (password.length >= 16) {
      result.score += 10;
    }

    // Character diversity bonus
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) {
      result.score += 5;
    }

    // Ensure score is within bounds
    result.score = Math.max(0, Math.min(100, result.score));

    // Determine validity
    result.isValid = result.errors.length === 0 && result.score >= 60;

    // Generate suggestions
    if (result.score < 60) {
      result.suggestions.push('Consider using a longer password with mixed character types');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.suggestions.push('Adding special characters can improve password strength');
    }
    if (password.length < 12) {
      result.suggestions.push('Passwords of 12+ characters are more secure');
    }

    return result;
  }

  /**
   * Generate secure random password
   * @param {Object} options - Generation options
   * @returns {string} Generated password
   */
  generateSecurePassword(options = {}) {
    const {
      length = 16,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSpecialChars = true,
      excludeSimilar = true, // Exclude similar-looking characters
      customCharset = null
    } = options;

    if (length < this.minPasswordLength || length > this.maxPasswordLength) {
      throw new Error(`Password length must be between ${this.minPasswordLength} and ${this.maxPasswordLength}`);
    }

    let charset = '';

    if (customCharset) {
      charset = customCharset;
    } else {
      if (includeLowercase) {
        charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
      }
      if (includeUppercase) {
        charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      }
      if (includeNumbers) {
        charset += excludeSimilar ? '23456789' : '0123456789';
      }
      if (includeSpecialChars) {
        charset += excludeSimilar ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:,.<>?';
      }
    }

    if (!charset) {
      throw new Error('At least one character type must be included');
    }

    // Generate password ensuring at least one character from each required type
    let password = '';
    const requiredChars = [];

    if (includeLowercase) {
      const lowerChars = excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
      requiredChars.push(lowerChars[crypto.randomInt(lowerChars.length)]);
    }
    if (includeUppercase) {
      const upperChars = excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      requiredChars.push(upperChars[crypto.randomInt(upperChars.length)]);
    }
    if (includeNumbers) {
      const numberChars = excludeSimilar ? '23456789' : '0123456789';
      requiredChars.push(numberChars[crypto.randomInt(numberChars.length)]);
    }
    if (includeSpecialChars) {
      const specialChars = excludeSimilar ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:,.<>?';
      requiredChars.push(specialChars[crypto.randomInt(specialChars.length)]);
    }

    // Fill remaining length with random characters
    for (let i = requiredChars.length; i < length; i++) {
      requiredChars.push(charset[crypto.randomInt(charset.length)]);
    }

    // Shuffle the array to randomize character positions
    for (let i = requiredChars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]];
    }

    return requiredChars.join('');
  }

  /**
   * Generate multiple password suggestions
   * @param {number} count - Number of passwords to generate
   * @param {Object} options - Generation options
   * @returns {Array<string>} Array of generated passwords
   */
  generatePasswordSuggestions(count = 3, options = {}) {
    const passwords = [];
    const variations = [
      { ...options, length: 12, includeSpecialChars: false },
      { ...options, length: 16, includeSpecialChars: true },
      { ...options, length: 20, includeSpecialChars: true, excludeSimilar: false }
    ];

    for (let i = 0; i < count; i++) {
      const variation = variations[i % variations.length];
      passwords.push(this.generateSecurePassword(variation));
    }

    return passwords;
  }

  /**
   * Check if password has been compromised (placeholder for future implementation)
   * @param {string} password - Password to check
   * @returns {Promise<boolean>} True if compromised
   */
  async isPasswordCompromised(password) {
    // This would integrate with Have I Been Pwned API or similar service
    // For now, return false (not compromised)
    
    // Example implementation would hash the password and check against known breaches
    // const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    // const prefix = hash.substring(0, 5);
    // const suffix = hash.substring(5);
    // Check against API...
    
    return false;
  }

  /**
   * Calculate entropy of password
   * @param {string} password - Password to analyze
   * @returns {number} Password entropy in bits
   */
  calculatePasswordEntropy(password) {
    if (!password) return 0;

    let charsetSize = 0;

    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) charsetSize += 32;

    return Math.log2(Math.pow(charsetSize, password.length));
  }

  /**
   * Get password strength description
   * @param {number} score - Password strength score (0-100)
   * @returns {Object} Strength description and color
   */
  getStrengthDescription(score) {
    if (score < 30) {
      return { level: 'Very Weak', color: '#d32f2f', description: 'This password is easily guessed' };
    } else if (score < 50) {
      return { level: 'Weak', color: '#f57c00', description: 'This password could be guessed' };
    } else if (score < 70) {
      return { level: 'Fair', color: '#fbc02d', description: 'This password is somewhat secure' };
    } else if (score < 90) {
      return { level: 'Good', color: '#689f38', description: 'This password is secure' };
    } else {
      return { level: 'Excellent', color: '#388e3c', description: 'This password is very secure' };
    }
  }

  /**
   * Check if password needs to be updated (age-based)
   * @param {Date} lastChanged - Date when password was last changed
   * @param {number} maxAgeDays - Maximum age in days before update required
   * @returns {boolean} True if password should be updated
   */
  shouldUpdatePassword(lastChanged, maxAgeDays = 90) {
    if (!lastChanged) return true;

    const now = new Date();
    const ageInDays = (now - lastChanged) / (1000 * 60 * 60 * 24);
    
    return ageInDays > maxAgeDays;
  }
}

// Export singleton instance
const passwordService = new PasswordService();

module.exports = passwordService;