const express = require('express');
const University = require('../models/University');

/**
 * University Routes
 * 
 * Handles university search, filtering, and program discovery
 */

const router = express.Router();

// GET /api/universities
router.get('/', async (req, res, next) => {
  try {
    const universities = await University.searchUniversities(req.query);
    
    res.status(200).json({
      success: true,
      universities,
      pagination: {
        currentPage: parseInt(req.query.page) || 1,
        totalPages: 1,
        totalItems: universities.length,
        itemsPerPage: parseInt(req.query.limit) || 20,
        hasNextPage: false,
        hasPreviousPage: false
      },
      filters: await University.getFilterOptions()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/universities/:id
router.get('/:id', async (req, res, next) => {
  try {
    const university = await University.findById(req.params.id);
    
    if (!university) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'UNIVERSITY_NOT_FOUND',
          message: 'University not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      university
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;