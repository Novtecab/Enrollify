const mongoose = require('mongoose');

/**
 * University Model - Represents educational institutions with program information
 * 
 * This model handles university data including location, rankings, programs,
 * requirements, deadlines, and fees for comprehensive university search.
 * 
 * Constitutional Requirements:
 * - Optimized indexing for fast search and filtering
 * - Comprehensive validation for data integrity
 * - Self-documenting structure with clear field purposes
 * - Performance-focused design for search operations
 */

// Program subdocument schema
const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Program name is required'],
    trim: true,
    maxlength: [200, 'Program name must be less than 200 characters']
  },
  level: {
    type: String,
    required: [true, 'Program level is required'],
    enum: {
      values: ['Bachelors', 'Masters', 'PhD', 'Certificate'],
      message: 'Program level must be one of: Bachelors, Masters, PhD, Certificate'
    }
  },
  department: {
    type: String,
    trim: true,
    maxlength: [150, 'Department name must be less than 150 characters']
  },
  fieldsOfStudy: [{
    type: String,
    trim: true,
    maxlength: [100, 'Field of study must be less than 100 characters']
  }],
  duration: {
    years: {
      type: Number,
      min: [0, 'Duration years must be positive'],
      max: [10, 'Duration years must be reasonable']
    },
    months: {
      type: Number,
      min: [0, 'Duration months must be positive'],
      max: [11, 'Duration months must be less than 12']
    }
  },
  requirements: {
    minGPA: {
      type: Number,
      min: [0.0, 'Minimum GPA must be at least 0.0'],
      max: [4.0, 'Minimum GPA cannot exceed 4.0']
    },
    languageRequirements: [{
      type: String,
      trim: true,
      maxlength: [100, 'Language requirement must be less than 100 characters']
    }],
    standardizedTests: [{
      type: String,
      trim: true,
      maxlength: [50, 'Test name must be less than 50 characters']
    }],
    documents: [{
      type: String,
      trim: true,
      maxlength: [100, 'Document requirement must be less than 100 characters']
    }]
  },
  deadlines: {
    applicationDeadline: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value > new Date();
        },
        message: 'Application deadline must be in the future'
      }
    },
    documentDeadline: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || !this.deadlines?.applicationDeadline || 
                 value >= this.deadlines.applicationDeadline;
        },
        message: 'Document deadline must be after application deadline'
      }
    },
    decisionDate: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || !this.deadlines?.applicationDeadline || 
                 value > this.deadlines.applicationDeadline;
        },
        message: 'Decision date must be after application deadline'
      }
    }
  },
  fees: {
    tuition: {
      type: Number,
      min: [0, 'Tuition fee must be positive']
    },
    application: {
      type: Number,
      min: [0, 'Application fee must be positive']
    },
    currency: {
      type: String,
      uppercase: true,
      minlength: [3, 'Currency code must be 3 characters'],
      maxlength: [3, 'Currency code must be 3 characters'],
      default: 'USD'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// University location subdocument
const locationSchema = new mongoose.Schema({
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City name must be less than 100 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State name must be less than 100 characters']
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  }
}, { _id: false });

// University ranking subdocument
const rankingSchema = new mongoose.Schema({
  global: {
    type: Number,
    min: [1, 'Global ranking must be positive']
  },
  national: {
    type: Number,
    min: [1, 'National ranking must be positive']
  },
  source: {
    type: String,
    trim: true,
    maxlength: [100, 'Ranking source must be less than 100 characters']
  }
}, { _id: false });

// Contact information subdocument
const contactInfoSchema = new mongoose.Schema({
  admissionsEmail: {
    type: String,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid admissions email'
    ]
  },
  phone: {
    type: String,
    trim: true,
    match: [
      /^\+?[\d\s\-\(\)]+$/,
      'Please provide a valid phone number'
    ]
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address must be less than 500 characters']
  }
}, { _id: false });

// Main University schema
const universitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'University name is required'],
    trim: true,
    maxlength: [200, 'University name must be less than 200 characters'],
    index: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country name must be less than 100 characters'],
    index: true
  },
  region: {
    type: String,
    required: [true, 'Region is required'],
    enum: {
      values: ['Europe', 'USA', 'GCC', 'Pakistan'],
      message: 'Region must be one of: Europe, USA, GCC, Pakistan'
    },
    index: true
  },
  
  details: {
    website: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+/,
        'Website must be a valid URL'
      ]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must be less than 2000 characters']
    },
    establishedYear: {
      type: Number,
      min: [1000, 'Established year must be realistic'],
      max: [new Date().getFullYear(), 'Established year cannot be in the future']
    },
    ranking: rankingSchema,
    location: locationSchema
  },
  
  programs: [programSchema],
  contactInfo: contactInfoSchema
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Compound indexes for optimized search performance
universitySchema.index({ country: 1, region: 1 });
universitySchema.index({ 'programs.fieldsOfStudy': 1 }); // Multikey index for array field
universitySchema.index({ 'programs.level': 1 });
universitySchema.index({ 'programs.deadlines.applicationDeadline': 1 });
universitySchema.index({ name: 'text', 'details.description': 'text' }); // Text search index
universitySchema.index({ 'details.ranking.global': 1 });
universitySchema.index({ 'details.location.city': 1 });

// Virtual for total number of programs
universitySchema.virtual('programCount').get(function() {
  return this.programs ? this.programs.filter(p => p.isActive).length : 0;
});

// Virtual for active programs only
universitySchema.virtual('activePrograms').get(function() {
  return this.programs ? this.programs.filter(p => p.isActive) : [];
});

// Virtual for nearest deadline
universitySchema.virtual('nearestDeadline').get(function() {
  if (!this.programs || this.programs.length === 0) return null;
  
  const now = new Date();
  const upcomingDeadlines = this.programs
    .filter(p => p.isActive && p.deadlines?.applicationDeadline)
    .map(p => p.deadlines.applicationDeadline)
    .filter(date => date > now)
    .sort((a, b) => a - b);
    
  return upcomingDeadlines.length > 0 ? upcomingDeadlines[0] : null;
});

// Virtual for all fields of study (unique)
universitySchema.virtual('allFieldsOfStudy').get(function() {
  if (!this.programs) return [];
  
  const allFields = this.programs
    .filter(p => p.isActive)
    .flatMap(p => p.fieldsOfStudy || []);
    
  return [...new Set(allFields)]; // Return unique fields
});

// Instance method to get programs by level
universitySchema.methods.getProgramsByLevel = function(level) {
  return this.programs.filter(p => p.isActive && p.level === level);
};

// Instance method to get programs by field of study
universitySchema.methods.getProgramsByField = function(field) {
  return this.programs.filter(p => 
    p.isActive && 
    p.fieldsOfStudy && 
    p.fieldsOfStudy.some(f => 
      f.toLowerCase().includes(field.toLowerCase())
    )
  );
};

// Instance method to check if university has programs with upcoming deadlines
universitySchema.methods.hasUpcomingDeadlines = function(daysFromNow = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  
  return this.programs.some(p => 
    p.isActive && 
    p.deadlines?.applicationDeadline &&
    p.deadlines.applicationDeadline <= futureDate &&
    p.deadlines.applicationDeadline > new Date()
  );
};

// Static method for advanced search with filtering
universitySchema.statics.searchUniversities = function(filters = {}) {
  const query = {};
  const {
    search,
    country,
    region,
    field,
    level,
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc'
  } = filters;

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Country filter
  if (country) {
    query.country = new RegExp(country, 'i');
  }

  // Region filter
  if (region) {
    query.region = region;
  }

  // Field of study filter
  if (field) {
    query['programs.fieldsOfStudy'] = new RegExp(field, 'i');
  }

  // Program level filter
  if (level) {
    query['programs.level'] = level;
  }

  // Only show universities with active programs
  query['programs.isActive'] = true;

  // Build sort object
  const sort = {};
  if (sortBy === 'ranking') {
    sort['details.ranking.global'] = sortOrder === 'desc' ? -1 : 1;
  } else if (sortBy === 'deadline') {
    sort['programs.deadlines.applicationDeadline'] = sortOrder === 'desc' ? -1 : 1;
  } else {
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean(); // Use lean() for better performance when only reading data
};

// Static method to get filter options for frontend
universitySchema.statics.getFilterOptions = async function() {
  const pipeline = [
    {
      $group: {
        _id: null,
        countries: { $addToSet: '$country' },
        regions: { $addToSet: '$region' },
        fieldsOfStudy: { $addToSet: '$programs.fieldsOfStudy' },
        levels: { $addToSet: '$programs.level' }
      }
    },
    {
      $project: {
        _id: 0,
        countries: { $sortArray: { input: '$countries', sortBy: 1 } },
        regions: { $sortArray: { input: '$regions', sortBy: 1 } },
        fieldsOfStudy: { 
          $sortArray: { 
            input: { 
              $reduce: {
                input: '$fieldsOfStudy',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] }
              }
            }, 
            sortBy: 1 
          }
        },
        levels: { $sortArray: { input: '$levels', sortBy: 1 } }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    countries: [],
    regions: [],
    fieldsOfStudy: [],
    levels: []
  };
};

// Static method to get universities count by region
universitySchema.statics.getUniversityStats = async function() {
  const pipeline = [
    {
      $group: {
        _id: '$region',
        count: { $sum: 1 },
        totalPrograms: { $sum: { $size: '$programs' } },
        avgRanking: { $avg: '$details.ranking.global' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ];

  return this.aggregate(pipeline);
};

// Static method to create university with validation
universitySchema.statics.createUniversity = async function(universityData) {
  const university = new this(universityData);
  return university.save();
};

// Pre-save middleware to validate program deadlines
universitySchema.pre('save', function(next) {
  if (this.programs && this.programs.length > 0) {
    for (const program of this.programs) {
      if (program.deadlines?.applicationDeadline && 
          program.deadlines?.documentDeadline &&
          program.deadlines.documentDeadline < program.deadlines.applicationDeadline) {
        return next(new Error('Document deadline must be after application deadline'));
      }
    }
  }
  next();
});

// Export the model
const University = mongoose.model('University', universitySchema);

module.exports = University;