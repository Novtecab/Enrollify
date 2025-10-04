const User = require('../models/User');
const Document = require('../models/Document');
const Application = require('../models/Application');
const passwordService = require('./passwordService');
const authService = require('./authService');

/**
 * User Service
 * 
 * Handles user-related business logic including profile management,
 * document handling, application tracking, and dashboard data.
 * 
 * Constitutional Requirements:
 * - Comprehensive input validation
 * - Privacy protection and data minimization
 * - Performance optimization for queries
 * - Error handling with user-friendly messages
 */

class UserService {
  /**
   * Create new user account
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and tokens
   */
  async createUser(userData) {
    try {
      // Validate required fields
      const { email, password, firstName, lastName, acceptTerms } = userData;

      if (!email || !password || !firstName || !lastName) {
        throw new Error('All required fields must be provided');
      }

      if (!acceptTerms) {
        throw new Error('Terms and conditions must be accepted');
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate password strength
      const passwordValidation = passwordService.validatePasswordStrength(password, {
        email,
        firstName,
        lastName
      });

      if (!passwordValidation.isValid) {
        const error = new Error('Password does not meet strength requirements');
        error.validationErrors = passwordValidation.errors;
        error.suggestions = passwordValidation.suggestions;
        throw error;
      }

      // Create user
      const user = await User.createUser({
        email,
        password,
        firstName,
        lastName
      });

      // Generate session and tokens
      user.generateSessionId();
      await user.save();

      const tokens = authService.generateTokens(user);

      return {
        user: this.sanitizeUserForResponse(user),
        tokens
      };
    } catch (error) {
      throw this.handleServiceError(error, 'User creation failed');
    }
  }

  /**
   * Authenticate user login
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} User and tokens
   */
  async authenticateUser(credentials) {
    try {
      const { email, password, rememberMe = false } = credentials;

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update login information
      user.generateSessionId();
      await user.updateLastLogin();

      const tokens = authService.generateTokens(user, rememberMe);

      return {
        user: this.sanitizeUserForResponse(user),
        tokens
      };
    } catch (error) {
      throw this.handleServiceError(error, 'Authentication failed');
    }
  }

  /**
   * Get user profile with populated references
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete user profile
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .populate('uploadedDocs', 'fileInfo metadata uploadedAt')
        .populate('applications', 'universityId programId status submittedAt deadlines');

      if (!user) {
        throw new Error('User not found');
      }

      return this.sanitizeUserForResponse(user);
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to retrieve user profile');
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile update data
   * @returns {Promise<Object>} Updated user profile
   */
  async updateUserProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate and sanitize update data
      const validatedData = this.validateProfileUpdateData(updateData);

      // Update profile sections
      if (validatedData.personalInfo) {
        user.profile.personalInfo = { 
          ...user.profile.personalInfo, 
          ...validatedData.personalInfo 
        };
      }

      if (validatedData.skills) {
        user.profile.skills = validatedData.skills;
      }

      if (validatedData.languages) {
        user.profile.languages = validatedData.languages;
      }

      if (validatedData.contactPreferences) {
        user.profile.contactPreferences = { 
          ...user.profile.contactPreferences, 
          ...validatedData.contactPreferences 
        };
      }

      if (validatedData.academicBackground) {
        user.profile.academicBackground = validatedData.academicBackground;
      }

      if (validatedData.workExperience) {
        user.profile.workExperience = validatedData.workExperience;
      }

      // Save user (triggers profile completion calculation)
      await user.save();

      return this.sanitizeUserForResponse(user);
    } catch (error) {
      throw this.handleServiceError(error, 'Profile update failed');
    }
  }

  /**
   * Add academic background entry
   * @param {string} userId - User ID
   * @param {Object} academicData - Academic background data
   * @returns {Promise<Object>} Added entry
   */
  async addAcademicBackground(userId, academicData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate academic data
      this.validateAcademicBackgroundData(academicData);

      user.profile.academicBackground.push(academicData);
      await user.save();

      const addedEntry = user.profile.academicBackground[user.profile.academicBackground.length - 1];
      return addedEntry;
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to add academic background');
    }
  }

  /**
   * Update academic background entry
   * @param {string} userId - User ID
   * @param {string} entryId - Academic entry ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated entry
   */
  async updateAcademicBackground(userId, entryId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const entry = user.profile.academicBackground.id(entryId);
      if (!entry) {
        throw new Error('Academic background entry not found');
      }

      // Validate update data
      this.validateAcademicBackgroundData(updateData);

      Object.assign(entry, updateData);
      await user.save();

      return entry;
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to update academic background');
    }
  }

  /**
   * Delete academic background entry
   * @param {string} userId - User ID
   * @param {string} entryId - Academic entry ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteAcademicBackground(userId, entryId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const entry = user.profile.academicBackground.id(entryId);
      if (!entry) {
        throw new Error('Academic background entry not found');
      }

      entry.deleteOne();
      await user.save();

      return true;
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to delete academic background');
    }
  }

  /**
   * Get user dashboard data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getUserDashboard(userId) {
    try {
      const user = await User.findById(userId)
        .populate('uploadedDocs', 'metadata.category uploadedAt')
        .populate('applications', 'status submittedAt universityId deadlines');

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate application statistics
      const applications = user.applications || [];
      const applicationStats = {
        total: applications.length,
        draft: applications.filter(app => app.status === 'Draft').length,
        submitted: applications.filter(app => app.status === 'Submitted').length,
        underReview: applications.filter(app => app.status === 'Under Review').length,
        accepted: applications.filter(app => app.status === 'Accepted').length,
        rejected: applications.filter(app => app.status === 'Rejected').length
      };

      // Calculate document statistics
      const documents = user.uploadedDocs || [];
      const documentStats = await Document.getDocumentStats(userId);

      // Get upcoming deadlines
      const upcomingDeadlines = await this.getUpcomingDeadlines(userId);

      // Get unread message count (placeholder)
      const notificationStats = {
        unread: 0, // Will be implemented with Message service
        total: 0
      };

      return {
        profileCompletion: user.profileCompletionStatus,
        applications: applicationStats,
        documents: documentStats,
        notifications: notificationStats,
        upcomingDeadlines
      };
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to retrieve dashboard data');
    }
  }

  /**
   * Get upcoming deadlines for user
   * @param {string} userId - User ID
   * @param {number} daysAhead - Days to look ahead
   * @returns {Promise<Array>} Upcoming deadlines
   */
  async getUpcomingDeadlines(userId, daysAhead = 30) {
    try {
      const applications = await Application.find({
        userId,
        status: { $in: ['Draft', 'Submitted'] },
        'deadlines.application': {
          $gte: new Date(),
          $lte: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
        }
      })
      .populate('universityId', 'name')
      .sort({ 'deadlines.application': 1 });

      return applications.map(app => ({
        applicationId: app._id,
        university: app.universityId.name,
        deadline: app.deadlines.application,
        daysRemaining: Math.ceil((app.deadlines.application - new Date()) / (1000 * 60 * 60 * 24)),
        status: app.status
      }));
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to retrieve upcoming deadlines');
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {Object} passwordData - Password change data
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, passwordData) {
    try {
      const { currentPassword, newPassword } = passwordData;

      if (!currentPassword || !newPassword) {
        throw new Error('Current and new passwords are required');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = passwordService.validatePasswordStrength(newPassword, {
        email: user.email,
        firstName: user.profile?.personalInfo?.firstName,
        lastName: user.profile?.personalInfo?.lastName
      });

      if (!passwordValidation.isValid) {
        const error = new Error('New password does not meet strength requirements');
        error.validationErrors = passwordValidation.errors;
        error.suggestions = passwordValidation.suggestions;
        throw error;
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
      user.generateSessionId(); // Invalidate existing sessions
      await user.save();

      return true;
    } catch (error) {
      throw this.handleServiceError(error, 'Password change failed');
    }
  }

  /**
   * Get user activity statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Activity statistics
   */
  async getUserActivityStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const [applicationStats, documentStats] = await Promise.all([
        Application.getApplicationStats({ userId }),
        Document.getDocumentStats(userId)
      ]);

      return {
        user: {
          joinedAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          profileCompletion: user.profileCompletionStatus.overallCompletion
        },
        applications: applicationStats,
        documents: documentStats
      };
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to retrieve activity statistics');
    }
  }

  /**
   * Validate profile update data
   * @param {Object} updateData - Data to validate
   * @returns {Object} Validated data
   */
  validateProfileUpdateData(updateData) {
    const validated = {};

    if (updateData.personalInfo) {
      validated.personalInfo = {};
      
      // Validate phone number
      if (updateData.personalInfo.phone) {
        if (!/^\+?[\d\s\-\(\)]+$/.test(updateData.personalInfo.phone)) {
          throw new Error('Invalid phone number format');
        }
        validated.personalInfo.phone = updateData.personalInfo.phone.trim();
      }

      // Validate other personal info fields
      ['firstName', 'lastName', 'nationality'].forEach(field => {
        if (updateData.personalInfo[field]) {
          validated.personalInfo[field] = updateData.personalInfo[field].trim();
        }
      });

      if (updateData.personalInfo.dateOfBirth) {
        const dob = new Date(updateData.personalInfo.dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw new Error('Invalid date of birth');
        }
        validated.personalInfo.dateOfBirth = dob;
      }

      if (updateData.personalInfo.address) {
        validated.personalInfo.address = updateData.personalInfo.address;
      }
    }

    if (updateData.skills) {
      if (!Array.isArray(updateData.skills)) {
        throw new Error('Skills must be an array');
      }
      validated.skills = updateData.skills.map(skill => skill.trim()).filter(Boolean);
    }

    if (updateData.languages) {
      if (!Array.isArray(updateData.languages)) {
        throw new Error('Languages must be an array');
      }
      
      validated.languages = updateData.languages.map(lang => {
        if (!lang.language || !lang.proficiency) {
          throw new Error('Language and proficiency are required');
        }
        
        if (!['Basic', 'Intermediate', 'Advanced', 'Native'].includes(lang.proficiency)) {
          throw new Error('Invalid proficiency level');
        }
        
        return {
          language: lang.language.trim(),
          proficiency: lang.proficiency
        };
      });
    }

    if (updateData.contactPreferences) {
      validated.contactPreferences = updateData.contactPreferences;
    }

    return validated;
  }

  /**
   * Validate academic background data
   * @param {Object} academicData - Academic data to validate
   * @throws {Error} Validation errors
   */
  validateAcademicBackgroundData(academicData) {
    if (!academicData.institutionName || !academicData.degree) {
      throw new Error('Institution name and degree are required');
    }

    if (academicData.gpa && (academicData.gpa < 0 || academicData.gpa > 4)) {
      throw new Error('GPA must be between 0.0 and 4.0');
    }

    if (academicData.startDate && academicData.endDate) {
      const start = new Date(academicData.startDate);
      const end = new Date(academicData.endDate);
      
      if (start > end) {
        throw new Error('End date must be after start date');
      }
    }
  }

  /**
   * Sanitize user data for API response
   * @param {Object} user - User document
   * @returns {Object} Sanitized user data
   */
  sanitizeUserForResponse(user) {
    const userObj = user.toJSON();
    
    // Remove sensitive fields
    delete userObj.passwordHash;
    delete userObj.sessionId;
    
    return userObj;
  }

  /**
   * Handle service errors with consistent formatting
   * @param {Error} error - Original error
   * @param {string} context - Error context
   * @returns {Error} Formatted error
   */
  handleServiceError(error, context) {
    if (error.name === 'ValidationError') {
      const validationError = new Error('Validation failed');
      validationError.code = 'VALIDATION_ERROR';
      validationError.details = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return validationError;
    }

    if (error.code === 11000) {
      const duplicateError = new Error('Duplicate value detected');
      duplicateError.code = 'DUPLICATE_ERROR';
      return duplicateError;
    }

    // Preserve validation errors from password service
    if (error.validationErrors) {
      error.code = 'VALIDATION_ERROR';
      return error;
    }

    // Generic error handling
    const serviceError = new Error(`${context}: ${error.message}`);
    serviceError.code = 'SERVICE_ERROR';
    serviceError.originalError = error;
    
    return serviceError;
  }
}

// Export singleton instance
const userService = new UserService();

module.exports = userService;