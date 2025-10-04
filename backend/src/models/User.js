const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model - Represents student accounts with comprehensive academic profiles
 * 
 * This model handles all user-related data including personal information,
 * academic background, work experience, and profile completion tracking.
 * 
 * Constitutional Requirements:
 * - Self-documenting code with clear naming conventions
 * - Comprehensive validation and error handling
 * - Security through password hashing and data validation
 * - Performance optimization through proper indexing
 */

// Address subdocument schema
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true,
    maxlength: [200, 'Street address must be less than 200 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City name must be less than 100 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State name must be less than 100 characters']
  },
  country: {
    type: String,
    trim: true,
    maxlength: [100, 'Country name must be less than 100 characters']
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code must be less than 20 characters']
  }
}, { _id: false });

// Academic background subdocument schema
const academicBackgroundSchema = new mongoose.Schema({
  institutionName: {
    type: String,
    required: [true, 'Institution name is required'],
    trim: true,
    maxlength: [200, 'Institution name must be less than 200 characters']
  },
  degree: {
    type: String,
    required: [true, 'Degree is required'],
    trim: true,
    maxlength: [100, 'Degree must be less than 100 characters']
  },
  fieldOfStudy: {
    type: String,
    trim: true,
    maxlength: [100, 'Field of study must be less than 100 characters']
  },
  gpa: {
    type: Number,
    min: [0.0, 'GPA must be at least 0.0'],
    max: [4.0, 'GPA must not exceed 4.0'],
    validate: {
      validator: function(value) {
        return value === undefined || (value >= 0 && value <= 4);
      },
      message: 'GPA must be between 0.0 and 4.0'
    }
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value <= new Date();
      },
      message: 'Start date cannot be in the future'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || !this.startDate || value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  isCurrentlyEnrolled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Work experience subdocument schema
const workExperienceSchema = new mongoose.Schema({
  company: {
    type: String,
    trim: true,
    maxlength: [200, 'Company name must be less than 200 characters']
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position must be less than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description must be less than 1000 characters']
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value <= new Date();
      },
      message: 'Start date cannot be in the future'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || !this.startDate || value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  isCurrentPosition: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Language proficiency subdocument schema
const languageSchema = new mongoose.Schema({
  language: {
    type: String,
    required: [true, 'Language is required'],
    trim: true,
    maxlength: [50, 'Language name must be less than 50 characters']
  },
  proficiency: {
    type: String,
    required: [true, 'Proficiency level is required'],
    enum: {
      values: ['Basic', 'Intermediate', 'Advanced', 'Native'],
      message: 'Proficiency must be one of: Basic, Intermediate, Advanced, Native'
    }
  }
}, { _id: false });

// Profile completion tracking subdocument
const profileCompletionSchema = new mongoose.Schema({
  personalInfo: {
    type: Boolean,
    default: false
  },
  academicBackground: {
    type: Boolean,
    default: false
  },
  documents: {
    type: Boolean,
    default: false
  },
  contactPreferences: {
    type: Boolean,
    default: false
  },
  overallCompletion: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, { _id: false });

// Main User schema
const userSchema = new mongoose.Schema({
  // Authentication fields
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ],
    maxlength: [254, 'Email must be less than 254 characters']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [60, 'Password hash is invalid'] // bcrypt hash length
  },
  sessionId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },

  // Profile information
  profile: {
    personalInfo: {
      firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters'],
        maxlength: [50, 'First name must be less than 50 characters']
      },
      lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters'],
        maxlength: [50, 'Last name must be less than 50 characters']
      },
      dateOfBirth: {
        type: Date,
        validate: {
          validator: function(value) {
            if (!value) return true;
            const today = new Date();
            const age = today.getFullYear() - value.getFullYear();
            return age >= 13 && age <= 100;
          },
          message: 'Age must be between 13 and 100 years'
        }
      },
      nationality: {
        type: String,
        trim: true,
        maxlength: [100, 'Nationality must be less than 100 characters']
      },
      phone: {
        type: String,
        trim: true,
        match: [
          /^\+?[\d\s\-\(\)]+$/,
          'Please provide a valid phone number'
        ],
        maxlength: [20, 'Phone number must be less than 20 characters']
      },
      address: addressSchema
    },
    
    academicBackground: [academicBackgroundSchema],
    workExperience: [workExperienceSchema],
    
    skills: [{
      type: String,
      trim: true,
      maxlength: [100, 'Skill name must be less than 100 characters']
    }],
    
    languages: [languageSchema],
    
    contactPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: false
      },
      marketingEmails: {
        type: Boolean,
        default: false
      }
    }
  },

  profileCompletionStatus: profileCompletionSchema,

  // Document references (populated from Document model)
  uploadedDocs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],

  // Application references (populated from Application model)
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.passwordHash;
      delete ret.sessionId;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes for performance optimization
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ sessionId: 1 }, { sparse: true });
userSchema.index({ 'profile.personalInfo.lastName': 1, 'profile.personalInfo.firstName': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'profileCompletionStatus.overallCompletion': -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile?.personalInfo?.firstName && this.profile?.personalInfo?.lastName) {
    return `${this.profile.personalInfo.firstName} ${this.profile.personalInfo.lastName}`;
  }
  return undefined;
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.profile?.personalInfo?.dateOfBirth) return undefined;
  
  const today = new Date();
  const birthDate = new Date(this.profile.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified or new
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to calculate profile completion
userSchema.pre('save', function(next) {
  this.calculateProfileCompletion();
  next();
});

// Instance method to verify password
userSchema.methods.verifyPassword = async function(candidatePassword) {
  if (!candidatePassword || !this.passwordHash) {
    return false;
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    return false;
  }
};

// Instance method to calculate profile completion percentage
userSchema.methods.calculateProfileCompletion = function() {
  const completion = this.profileCompletionStatus || {};
  
  // Personal Info Check (30% weight)
  completion.personalInfo = !!(
    this.profile?.personalInfo?.firstName &&
    this.profile?.personalInfo?.lastName &&
    this.profile?.personalInfo?.phone &&
    this.profile?.personalInfo?.dateOfBirth &&
    this.profile?.personalInfo?.nationality
  );
  
  // Academic Background Check (25% weight)
  completion.academicBackground = !!(
    this.profile?.academicBackground &&
    this.profile.academicBackground.length > 0
  );
  
  // Documents Check (25% weight) - Will be updated when documents are uploaded
  // completion.documents is managed externally
  
  // Contact Preferences Check (20% weight)
  completion.contactPreferences = !!(
    typeof this.profile?.contactPreferences?.emailNotifications === 'boolean' &&
    typeof this.profile?.contactPreferences?.smsNotifications === 'boolean' &&
    typeof this.profile?.contactPreferences?.marketingEmails === 'boolean'
  );
  
  // Calculate overall completion percentage
  let totalWeight = 0;
  let completedWeight = 0;
  
  if (completion.personalInfo) completedWeight += 30;
  totalWeight += 30;
  
  if (completion.academicBackground) completedWeight += 25;
  totalWeight += 25;
  
  if (completion.documents) completedWeight += 25;
  totalWeight += 25;
  
  if (completion.contactPreferences) completedWeight += 20;
  totalWeight += 20;
  
  completion.overallCompletion = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  
  this.profileCompletionStatus = completion;
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Instance method to generate session ID
userSchema.methods.generateSessionId = function() {
  const crypto = require('crypto');
  this.sessionId = crypto.randomBytes(32).toString('hex');
  return this.sessionId;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Static method to find by session ID
userSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId });
};

// Static method to create new user with validation
userSchema.statics.createUser = async function(userData) {
  const user = new this({
    email: userData.email,
    passwordHash: userData.password, // Will be hashed by pre-save middleware
    profile: {
      personalInfo: {
        firstName: userData.firstName,
        lastName: userData.lastName
      },
      contactPreferences: {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: false
      }
    }
  });
  
  return user.save();
};

// Export the model
const User = mongoose.model('User', userSchema);

module.exports = User;