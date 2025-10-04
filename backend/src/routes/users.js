const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const userService = require('../services/userService');

/**
 * User Routes
 * 
 * Handles user profile management, dashboard data, and profile updates
 * following constitutional requirements for validation and security.
 */

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Profile update validation
const profileUpdateValidation = [
  body('personalInfo.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('personalInfo.lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('personalInfo.phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('personalInfo.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('languages.*.proficiency')
    .optional()
    .isIn(['Basic', 'Intermediate', 'Advanced', 'Native'])
    .withMessage('Language proficiency must be one of: Basic, Intermediate, Advanced, Native')
];

// Academic background validation
const academicBackgroundValidation = [
  body('institutionName')
    .trim()
    .notEmpty()
    .withMessage('Institution name is required')
    .isLength({ max: 200 })
    .withMessage('Institution name must be less than 200 characters'),
  body('degree')
    .trim()
    .notEmpty()
    .withMessage('Degree is required')
    .isLength({ max: 100 })
    .withMessage('Degree must be less than 100 characters'),
  body('gpa')
    .optional()
    .isFloat({ min: 0, max: 4 })
    .withMessage('GPA must be between 0.0 and 4.0')
];

// GET /api/users/profile
router.get('/profile', async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.userId);
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    next(error);
  }
});

// PUT /api/users/profile
router.put('/profile', profileUpdateValidation, async (req, res, next) => {
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

    const user = req.user;
    const updateData = req.body;

    // Update profile sections if provided
    if (updateData.personalInfo) {
      user.profile.personalInfo = { ...user.profile.personalInfo, ...updateData.personalInfo };
    }

    if (updateData.skills) {
      user.profile.skills = updateData.skills;
    }

    if (updateData.languages) {
      user.profile.languages = updateData.languages;
    }

    if (updateData.contactPreferences) {
      user.profile.contactPreferences = { ...user.profile.contactPreferences, ...updateData.contactPreferences };
    }

    // Save user (this will trigger profile completion calculation)
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        personalInfo: user.profile.personalInfo,
        academicBackground: user.profile.academicBackground,
        workExperience: user.profile.workExperience,
        skills: user.profile.skills,
        languages: user.profile.languages,
        contactPreferences: user.profile.contactPreferences,
        profileCompletion: user.profileCompletionStatus,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const dashboard = await userService.getUserDashboard(req.userId);

    res.status(200).json({
      success: true,
      dashboard
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    next(error);
  }
});

// GET /api/users/profile/completion
router.get('/profile/completion', async (req, res, next) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      success: true,
      completion: user.profileCompletionStatus
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/academic-background
router.post('/academic-background', academicBackgroundValidation, async (req, res, next) => {
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

    const user = req.user;
    const academicEntry = req.body;

    // Add new academic background entry
    user.profile.academicBackground.push(academicEntry);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Academic background added successfully',
      entry: user.profile.academicBackground[user.profile.academicBackground.length - 1]
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/academic-background
router.put('/academic-background', academicBackgroundValidation, async (req, res, next) => {
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

    const user = req.user;
    const { entryId } = req.query;
    const updateData = req.body;

    // Find and update the academic background entry
    const entry = user.profile.academicBackground.id(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Academic background entry not found'
        }
      });
    }

    Object.assign(entry, updateData);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Academic background updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/academic-background
router.delete('/academic-background', async (req, res, next) => {
  try {
    const user = req.user;
    const { entryId } = req.query;

    // Find and remove the academic background entry
    const entry = user.profile.academicBackground.id(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Academic background entry not found'
        }
      });
    }

    entry.deleteOne();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Academic background deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/work-experience
router.post('/work-experience', [
  body('company').optional().trim().isLength({ max: 200 }),
  body('position').optional().trim().isLength({ max: 100 })
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

    const user = req.user;
    const workEntry = req.body;

    user.profile.workExperience.push(workEntry);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Work experience added successfully',
      entry: user.profile.workExperience[user.profile.workExperience.length - 1]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;