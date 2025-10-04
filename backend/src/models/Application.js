const mongoose = require('mongoose');

/**
 * Application Model - Tracks student applications to university programs
 * 
 * This model handles application data including status tracking, document references,
 * admin notes, and timeline management for university applications.
 * 
 * Constitutional Requirements:
 * - Comprehensive status tracking with audit trail
 * - Secure document reference management
 * - Performance optimization through proper indexing
 * - Data validation for integrity and security
 */

// Reference subdocument schema
const referenceSchema = new mongoose.Schema({
  refereeeName: {
    type: String,
    required: [true, 'Referee name is required'],
    trim: true,
    maxlength: [100, 'Referee name must be less than 100 characters']
  },
  refereeEmail: {
    type: String,
    required: [true, 'Referee email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid referee email'
    ]
  },
  relationship: {
    type: String,
    required: [true, 'Relationship is required'],
    trim: true,
    maxlength: [100, 'Relationship description must be less than 100 characters']
  },
  submittedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: {
      values: ['Pending', 'Submitted', 'Declined'],
      message: 'Reference status must be one of: Pending, Submitted, Declined'
    },
    default: 'Pending'
  }
}, { _id: true, timestamps: true });

// Application response subdocument schema
const responseSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [1000, 'Question must be less than 1000 characters']
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
    maxlength: [10000, 'Answer must be less than 10000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['text', 'essay', 'multiple_choice'],
      message: 'Response type must be one of: text, essay, multiple_choice'
    },
    default: 'text'
  }
}, { _id: true });

// Status history subdocument schema
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected', 'Waitlisted'],
      message: 'Status must be one of: Draft, Submitted, Under Review, Accepted, Rejected, Waitlisted'
    }
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Changed by is required']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Status notes must be less than 1000 characters']
  },
  isSystemGenerated: {
    type: Boolean,
    default: false
  }
}, { _id: true });

// Admin notes subdocument schema
const adminNoteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true,
    maxlength: [2000, 'Note must be less than 2000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Note creator is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isInternal: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['General', 'Academic', 'Documents', 'Interview', 'Decision'],
    default: 'General'
  }
}, { _id: true });

// Main Application schema
const applicationSchema = new mongoose.Schema({
  // User and University references
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    required: [true, 'University ID is required'],
    index: true
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Program ID is required']
  },

  // Application data
  applicationData: {
    personalStatement: {
      type: String,
      trim: true,
      maxlength: [5000, 'Personal statement must be less than 5000 characters']
    },
    references: [referenceSchema],
    additionalDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }],
    responses: [responseSchema]
  },

  // Status tracking
  status: {
    type: String,
    required: [true, 'Application status is required'],
    enum: {
      values: ['Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected', 'Waitlisted'],
      message: 'Status must be one of: Draft, Submitted, Under Review, Accepted, Rejected, Waitlisted'
    },
    default: 'Draft',
    index: true
  },

  statusHistory: [statusHistorySchema],

  // Important dates
  submittedAt: {
    type: Date,
    index: true
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },
  deadlines: {
    application: {
      type: Date,
      required: [true, 'Application deadline is required'],
      validate: {
        validator: function(value) {
          return !this.submittedAt || value >= this.submittedAt;
        },
        message: 'Application deadline must be after submission date'
      }
    },
    documents: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value >= this.deadlines?.application;
        },
        message: 'Document deadline must be after application deadline'
      }
    }
  },

  // Admin management
  adminNotes: [adminNoteSchema],
  priority: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High', 'Urgent'],
      message: 'Priority must be one of: Low, Medium, High, Urgent'
    },
    default: 'Medium'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag must be less than 50 characters']
  }],

  // Application metrics
  metrics: {
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewedAt: {
      type: Date
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }
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

// Compound indexes for performance optimization
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ universityId: 1, status: 1 });
applicationSchema.index({ userId: 1, submittedAt: -1 });
applicationSchema.index({ 'deadlines.application': 1, status: 1 });
applicationSchema.index({ priority: 1, status: 1 });
applicationSchema.index({ tags: 1 });

// Virtual for days until deadline
applicationSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.deadlines?.application) return null;
  
  const now = new Date();
  const deadline = new Date(this.deadlines.application);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// Virtual for application completion status
applicationSchema.virtual('isComplete').get(function() {
  return this.metrics?.completionPercentage >= 100;
});

// Virtual for overdue status
applicationSchema.virtual('isOverdue').get(function() {
  if (!this.deadlines?.application || this.status !== 'Draft') return false;
  return new Date() > new Date(this.deadlines.application);
});

// Pre-save middleware to update lastModifiedAt
applicationSchema.pre('save', function(next) {
  this.lastModifiedAt = new Date();
  this.calculateCompletionPercentage();
  next();
});

// Pre-save middleware to add status history entry
applicationSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.modifiedBy || null, // Should be set by the calling code
      isSystemGenerated: !this.modifiedBy
    });
  }
  next();
});

// Instance method to calculate completion percentage
applicationSchema.methods.calculateCompletionPercentage = function() {
  let completed = 0;
  let total = 0;

  // Personal statement (20% weight)
  total += 20;
  if (this.applicationData?.personalStatement && this.applicationData.personalStatement.length > 100) {
    completed += 20;
  }

  // References (30% weight - divided by number of required references)
  const requiredReferences = 3; // Configurable based on program requirements
  total += 30;
  const submittedReferences = this.applicationData?.references?.filter(ref => ref.status === 'Submitted').length || 0;
  completed += Math.min(30, (submittedReferences / requiredReferences) * 30);

  // Documents (30% weight)
  total += 30;
  if (this.applicationData?.additionalDocuments && this.applicationData.additionalDocuments.length > 0) {
    completed += 30;
  }

  // Responses (20% weight)
  total += 20;
  const requiredResponses = this.applicationData?.responses?.length || 0;
  const completedResponses = this.applicationData?.responses?.filter(resp => resp.answer && resp.answer.length > 0).length || 0;
  if (requiredResponses > 0) {
    completed += (completedResponses / requiredResponses) * 20;
  } else {
    completed += 20; // No responses required
  }

  this.metrics.completionPercentage = Math.round(completed);
  return this.metrics.completionPercentage;
};

// Instance method to submit application
applicationSchema.methods.submitApplication = function(submittedBy) {
  if (this.status !== 'Draft') {
    throw new Error('Only draft applications can be submitted');
  }

  if (this.metrics.completionPercentage < 100) {
    throw new Error('Application must be 100% complete before submission');
  }

  if (this.isOverdue) {
    throw new Error('Cannot submit application after deadline');
  }

  this.status = 'Submitted';
  this.submittedAt = new Date();
  this.modifiedBy = submittedBy;

  return this.save();
};

// Instance method to add admin note
applicationSchema.methods.addAdminNote = function(noteContent, adminId, isInternal = true, category = 'General') {
  this.adminNotes.push({
    note: noteContent,
    createdBy: adminId,
    isInternal,
    category
  });

  return this.save();
};

// Static method to find applications by user
applicationSchema.statics.findByUser = function(userId, options = {}) {
  const {
    status,
    limit = 10,
    skip = 0,
    sort = { updatedAt: -1 }
  } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('universityId', 'name country region')
    .populate('additionalDocuments', 'fileInfo metadata')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to find applications by university
applicationSchema.statics.findByUniversity = function(universityId, options = {}) {
  const {
    status,
    limit = 20,
    skip = 0,
    sort = { submittedAt: -1 }
  } = options;

  const query = { universityId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('userId', 'profile.personalInfo.firstName profile.personalInfo.lastName email')
    .populate('additionalDocuments', 'fileInfo metadata')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to get application statistics
applicationSchema.statics.getApplicationStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgCompletion: { $avg: '$metrics.completionPercentage' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        byStatus: {
          $push: {
            status: '$_id',
            count: '$count',
            avgCompletion: '$avgCompletion'
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || { total: 0, byStatus: [] };
};

// Static method to find upcoming deadlines
applicationSchema.statics.findUpcomingDeadlines = function(daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return this.find({
    'deadlines.application': {
      $gte: now,
      $lte: futureDate
    },
    status: { $in: ['Draft', 'Submitted'] }
  })
  .populate('userId', 'profile.personalInfo.firstName profile.personalInfo.lastName email')
  .populate('universityId', 'name')
  .sort({ 'deadlines.application': 1 });
};

// Export the model
const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;