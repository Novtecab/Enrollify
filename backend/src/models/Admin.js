const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Admin Model - Represents administrative users with role-based permissions
 * 
 * This model handles admin accounts, permissions, activity logging,
 * and security features for platform administration.
 * 
 * Constitutional Requirements:
 * - Role-based access control with granular permissions
 * - Comprehensive activity logging for audit trail
 * - Security measures for privileged accounts
 * - Performance optimization for admin operations
 */

// Permission subdocument schema
const permissionSchema = new mongoose.Schema({
  module: {
    type: String,
    required: [true, 'Permission module is required'],
    enum: {
      values: ['users', 'applications', 'universities', 'documents', 'messages', 'analytics', 'system'],
      message: 'Module must be one of: users, applications, universities, documents, messages, analytics, system'
    }
  },
  actions: [{
    type: String,
    enum: {
      values: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'export'],
      message: 'Action must be one of: create, read, update, delete, approve, reject, export'
    }
  }]
}, { _id: false });

// Activity log subdocument schema
const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action must be less than 100 characters']
  },
  module: {
    type: String,
    required: [true, 'Module is required'],
    enum: ['users', 'applications', 'universities', 'documents', 'messages', 'analytics', 'system']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  targetType: {
    type: String,
    enum: ['User', 'Application', 'University', 'Document', 'Message']
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent must be less than 500 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    trim: true
  }
}, { _id: true });

// Security settings subdocument schema
const securitySettingsSchema = new mongoose.Schema({
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    select: false // Never include in queries by default
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  passwordExpiresAt: {
    type: Date
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    max: [10, 'Too many failed login attempts']
  },
  lockedUntil: {
    type: Date
  },
  allowedIPs: [{
    type: String,
    validate: {
      validator: function(ip) {
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) || ip === '*';
      },
      message: 'Invalid IP address format'
    }
  }],
  sessionTimeout: {
    type: Number,
    default: 3600, // 1 hour in seconds
    min: [300, 'Session timeout must be at least 5 minutes'],
    max: [86400, 'Session timeout cannot exceed 24 hours']
  }
}, { _id: false });

// Notification preferences subdocument schema
const notificationPreferencesSchema = new mongoose.Schema({
  emailNotifications: {
    newApplications: { type: Boolean, default: true },
    statusChanges: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: false }
  },
  dashboardAlerts: {
    urgentApplications: { type: Boolean, default: true },
    documentReviews: { type: Boolean, default: true },
    systemHealth: { type: Boolean, default: true }
  }
}, { _id: false });

// Main Admin schema
const adminSchema = new mongoose.Schema({
  // Basic information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username must be less than 50 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [60, 'Password hash is invalid'], // bcrypt hash length
    select: false // Never include in queries by default
  },

  // Profile information
  profile: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name must be less than 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name must be less than 50 characters']
    },
    avatar: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department must be less than 100 characters']
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title must be less than 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^\+?[\d\s\-\(\)]+$/,
        'Please provide a valid phone number'
      ]
    }
  },

  // Role and permissions
  role: {
    type: String,
    required: [true, 'Admin role is required'],
    enum: {
      values: ['super_admin', 'admin', 'moderator', 'viewer'],
      message: 'Role must be one of: super_admin, admin, moderator, viewer'
    },
    index: true
  },
  permissions: [permissionSchema],
  customPermissions: {
    type: Map,
    of: Boolean,
    default: new Map()
  },

  // Status and session management
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'pending'],
      message: 'Status must be one of: active, inactive, suspended, pending'
    },
    default: 'pending',
    index: true
  },
  sessionId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  lastLoginAt: {
    type: Date
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },

  // Security
  security: securitySettingsSchema,

  // Activity tracking
  activityLog: [activityLogSchema],
  notificationPreferences: notificationPreferencesSchema,

  // Administrative
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes must be less than 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.passwordHash;
      delete ret.sessionId;
      delete ret.security.mfaSecret;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes for performance optimization
adminSchema.index({ username: 1 }, { unique: true });
adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ role: 1, status: 1 });
adminSchema.index({ lastActiveAt: -1 });
adminSchema.index({ 'activityLog.timestamp': -1 });
adminSchema.index({ 'activityLog.module': 1, 'activityLog.action': 1 });

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
  return this.security?.lockedUntil && this.security.lockedUntil > new Date();
});

// Virtual for password expiry status
adminSchema.virtual('isPasswordExpired').get(function() {
  return this.security?.passwordExpiresAt && this.security.passwordExpiresAt < new Date();
});

// Virtual for session status
adminSchema.virtual('isSessionActive').get(function() {
  if (!this.lastActiveAt || !this.security?.sessionTimeout) return false;
  
  const sessionExpiresAt = new Date(this.lastActiveAt.getTime() + (this.security.sessionTimeout * 1000));
  return sessionExpiresAt > new Date();
});

// Virtual for recent activity
adminSchema.virtual('recentActivity').get(function() {
  return this.activityLog
    .filter(log => log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    this.security.lastPasswordChange = new Date();
    
    // Set password expiry (90 days for admin accounts)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);
    this.security.passwordExpiresAt = expiryDate;
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastActiveAt
adminSchema.pre('save', function(next) {
  if (this.isModified('sessionId') && this.sessionId) {
    this.lastActiveAt = new Date();
  }
  next();
});

// Instance method to verify password
adminSchema.methods.verifyPassword = async function(candidatePassword) {
  if (!candidatePassword || !this.passwordHash) {
    return false;
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    return false;
  }
};

// Instance method to check permissions
adminSchema.methods.hasPermission = function(module, action) {
  // Super admin has all permissions
  if (this.role === 'super_admin') {
    return true;
  }

  // Check custom permissions first
  const customKey = `${module}.${action}`;
  if (this.customPermissions && this.customPermissions.has(customKey)) {
    return this.customPermissions.get(customKey);
  }

  // Check role-based permissions
  const permission = this.permissions.find(p => p.module === module);
  return permission && permission.actions.includes(action);
};

// Instance method to log activity
adminSchema.methods.logActivity = function(action, module, targetId = null, targetType = null, details = null, ipAddress = null, userAgent = null) {
  this.activityLog.push({
    action,
    module,
    targetId,
    targetType,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });

  // Keep only last 1000 activity logs to prevent document size issues
  if (this.activityLog.length > 1000) {
    this.activityLog = this.activityLog.slice(-1000);
  }

  return this.save();
};

// Instance method to handle failed login
adminSchema.methods.handleFailedLogin = function() {
  this.security.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts
  if (this.security.failedLoginAttempts >= 5) {
    this.security.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }

  return this.save();
};

// Instance method to handle successful login
adminSchema.methods.handleSuccessfulLogin = function(ipAddress, userAgent) {
  this.security.failedLoginAttempts = 0;
  this.security.lockedUntil = undefined;
  this.lastLoginAt = new Date();
  this.generateSessionId();

  this.logActivity('login', 'system', null, null, { ipAddress, userAgent }, ipAddress, userAgent);

  return this.save();
};

// Instance method to generate session ID
adminSchema.methods.generateSessionId = function() {
  const crypto = require('crypto');
  this.sessionId = crypto.randomBytes(32).toString('hex');
  return this.sessionId;
};

// Instance method to check IP access
adminSchema.methods.isIPAllowed = function(ipAddress) {
  if (!this.security?.allowedIPs || this.security.allowedIPs.length === 0) {
    return true; // No restrictions
  }

  return this.security.allowedIPs.includes('*') || this.security.allowedIPs.includes(ipAddress);
};

// Static method to find by username or email
adminSchema.statics.findByCredentials = function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { email: identifier.toLowerCase() }
    ]
  }).select('+passwordHash');
};

// Static method to create admin with default permissions
adminSchema.statics.createAdmin = async function(adminData, createdBy = null) {
  const defaultPermissions = {
    admin: [
      { module: 'users', actions: ['read', 'update'] },
      { module: 'applications', actions: ['read', 'update', 'approve', 'reject'] },
      { module: 'universities', actions: ['read', 'update'] },
      { module: 'documents', actions: ['read'] },
      { module: 'messages', actions: ['create', 'read', 'update'] },
      { module: 'analytics', actions: ['read'] }
    ],
    moderator: [
      { module: 'users', actions: ['read'] },
      { module: 'applications', actions: ['read', 'update'] },
      { module: 'universities', actions: ['read'] },
      { module: 'documents', actions: ['read'] },
      { module: 'messages', actions: ['create', 'read'] }
    ],
    viewer: [
      { module: 'users', actions: ['read'] },
      { module: 'applications', actions: ['read'] },
      { module: 'universities', actions: ['read'] },
      { module: 'analytics', actions: ['read'] }
    ]
  };

  const admin = new this({
    ...adminData,
    permissions: defaultPermissions[adminData.role] || [],
    createdBy
  });

  return admin.save();
};

// Static method to get admin statistics
adminSchema.statics.getAdminStats = async function() {
  const pipeline = [
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        lastActive: { $max: '$lastActiveAt' }
      }
    }
  ];

  return this.aggregate(pipeline);
};

// Static method to find inactive admins
adminSchema.statics.findInactive = function(daysInactive = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  return this.find({
    lastActiveAt: { $lt: cutoffDate },
    status: 'active'
  });
};

// Static method to clean up old activity logs
adminSchema.statics.cleanupActivityLogs = async function() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days of logs

  const result = await this.updateMany(
    {},
    {
      $pull: {
        activityLog: {
          timestamp: { $lt: cutoffDate }
        }
      }
    }
  );

  return result.modifiedCount;
};

// Export the model
const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;