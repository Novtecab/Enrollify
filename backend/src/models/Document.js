const mongoose = require('mongoose');

/**
 * Document Model - Manages uploaded files with metadata and access controls
 * 
 * This model handles file upload metadata, security scanning, access controls,
 * and integration with cloud storage services like Cloudinary.
 * 
 * Constitutional Requirements:
 * - Comprehensive security validation and virus scanning
 * - Detailed access logging and audit trail
 * - Performance optimization through proper indexing
 * - Privacy protection with access controls
 */

// File information subdocument schema
const fileInfoSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true,
    maxlength: [255, 'Filename must be less than 255 characters']
  },
  fileName: {
    type: String,
    required: [true, 'Sanitized filename is required'],
    trim: true,
    maxlength: [255, 'Filename must be less than 255 characters']
  },
  fileType: {
    type: String,
    required: [true, 'File MIME type is required'],
    lowercase: true,
    trim: true
  },
  fileExtension: {
    type: String,
    required: [true, 'File extension is required'],
    lowercase: true,
    trim: true,
    maxlength: [10, 'File extension must be less than 10 characters']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0'],
    max: [10485760, 'File size must not exceed 10MB'] // 10MB limit
  },
  checksum: {
    type: String,
    required: [true, 'File checksum is required'],
    trim: true
  }
}, { _id: false });

// Storage information subdocument schema
const storageSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: [true, 'Storage provider is required'],
    enum: {
      values: ['cloudinary', 's3', 'local'],
      message: 'Storage provider must be one of: cloudinary, s3, local'
    }
  },
  publicId: {
    type: String,
    required: [true, 'Storage public ID is required'],
    unique: true,
    trim: true
  },
  url: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true
  },
  secureUrl: {
    type: String,
    required: [true, 'Secure file URL is required'],
    trim: true
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  region: {
    type: String,
    trim: true
  },
  bucket: {
    type: String,
    trim: true
  }
}, { _id: false });

// Document metadata subdocument schema
const metadataSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Document category is required'],
    enum: {
      values: ['CV', 'Transcript', 'Degree', 'Recommendation', 'Portfolio', 'Other'],
      message: 'Category must be one of: CV, Transcript, Degree, Recommendation, Portfolio, Other'
    },
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must be less than 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag must be less than 50 characters']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Expiration date must be in the future'
    }
  },
  language: {
    type: String,
    trim: true,
    maxlength: [10, 'Language code must be less than 10 characters']
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  }
}, { _id: false });

// Security information subdocument schema
const securitySchema = new mongoose.Schema({
  scanStatus: {
    type: String,
    required: [true, 'Scan status is required'],
    enum: {
      values: ['Pending', 'Clean', 'Infected', 'Error', 'Quarantined'],
      message: 'Scan status must be one of: Pending, Clean, Infected, Error, Quarantined'
    },
    default: 'Pending',
    index: true
  },
  scanDate: {
    type: Date
  },
  scanProvider: {
    type: String,
    trim: true
  },
  scanDetails: {
    type: String,
    trim: true
  },
  accessCount: {
    type: Number,
    default: 0,
    min: [0, 'Access count cannot be negative']
  },
  downloadRestrictions: {
    maxDownloads: {
      type: Number,
      min: [0, 'Max downloads cannot be negative']
    },
    allowedIPs: [{
      type: String,
      validate: {
        validator: function(ip) {
          return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) || ip === 'localhost';
        },
        message: 'Invalid IP address format'
      }
    }],
    expiresAt: {
      type: Date
    }
  },
  encryptionStatus: {
    type: String,
    enum: ['None', 'At-Rest', 'In-Transit', 'Both'],
    default: 'At-Rest'
  }
}, { _id: false });

// Access log subdocument schema
const accessLogSchema = new mongoose.Schema({
  accessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Accessed by user ID is required']
  },
  accessedAt: {
    type: Date,
    default: Date.now
  },
  accessType: {
    type: String,
    enum: {
      values: ['View', 'Download', 'Share', 'Delete'],
      message: 'Access type must be one of: View, Download, Share, Delete'
    },
    required: [true, 'Access type is required']
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
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    trim: true
  }
}, { _id: true });

// Main Document schema
const documentSchema = new mongoose.Schema({
  // Owner information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // File information
  fileInfo: fileInfoSchema,
  storage: storageSchema,
  metadata: metadataSchema,
  security: securitySchema,

  // Upload information
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },

  // Application associations
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],

  // Access control
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['View', 'Download'],
      default: 'View'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    }
  }],

  // Access logging
  accessLogs: [accessLogSchema],

  // Document status
  status: {
    type: String,
    enum: {
      values: ['Active', 'Archived', 'Deleted', 'Quarantined'],
      message: 'Status must be one of: Active, Archived, Deleted, Quarantined'
    },
    default: 'Active',
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      // Don't expose sensitive security details
      if (ret.security) {
        delete ret.security.downloadRestrictions;
        delete ret.security.scanDetails;
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Compound indexes for performance optimization
documentSchema.index({ userId: 1, 'metadata.category': 1 });
documentSchema.index({ 'storage.publicId': 1 }, { unique: true });
documentSchema.index({ uploadedAt: -1 });
documentSchema.index({ 'security.scanStatus': 1 });
documentSchema.index({ status: 1, uploadedAt: -1 });
documentSchema.index({ 'metadata.tags': 1 });
documentSchema.index({ 'metadata.expiresAt': 1 });

// Virtual for file size in human readable format
documentSchema.virtual('fileSizeFormatted').get(function() {
  const size = this.fileInfo?.fileSize || 0;
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = size;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }

  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
});

// Virtual for document age
documentSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const uploaded = new Date(this.uploadedAt);
  const diffTime = Math.abs(now - uploaded);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for expiry status
documentSchema.virtual('isExpired').get(function() {
  if (!this.metadata?.expiresAt) return false;
  return new Date() > new Date(this.metadata.expiresAt);
});

// Virtual for security status
documentSchema.virtual('isSecure').get(function() {
  return this.security?.scanStatus === 'Clean' && 
         this.status === 'Active' && 
         !this.isExpired;
});

// Pre-save middleware to update lastModifiedAt
documentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedAt = new Date();
  }
  next();
});

// Pre-save middleware to validate file security
documentSchema.pre('save', function(next) {
  if (this.security?.scanStatus === 'Infected' && this.status === 'Active') {
    this.status = 'Quarantined';
  }
  next();
});

// Instance method to log access
documentSchema.methods.logAccess = function(userId, accessType, ipAddress, userAgent, success = true, errorMessage = null) {
  this.accessLogs.push({
    accessedBy: userId,
    accessType,
    ipAddress,
    userAgent,
    success,
    errorMessage
  });

  // Update access statistics
  if (success) {
    this.security.accessCount += 1;
    this.lastAccessedAt = new Date();
  }

  return this.save();
};

// Instance method to generate secure download URL
documentSchema.methods.generateSecureUrl = function(expiresInMinutes = 60) {
  // This would integrate with the cloud storage service
  // For now, return the secure URL with expiration logic
  const cloudinaryService = require('../utils/cloudinary');
  
  if (this.storage.provider === 'cloudinary') {
    return cloudinaryService.generateSecureUrl(this.storage.publicId, {
      expires_at: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60)
    });
  }

  return this.storage.secureUrl;
};

// Instance method to check access permissions
documentSchema.methods.canAccess = function(userId, accessType = 'View') {
  // Owner always has access
  if (this.userId.toString() === userId.toString()) {
    return true;
  }

  // Check if document is shared with user
  const sharedEntry = this.sharedWith.find(shared => 
    shared.userId.toString() === userId.toString() &&
    (!shared.expiresAt || shared.expiresAt > new Date())
  );

  if (sharedEntry) {
    return accessType === 'View' || sharedEntry.permission === 'Download';
  }

  // Check if document is public
  return this.metadata?.isPublic && accessType === 'View';
};

// Instance method to share document
documentSchema.methods.shareWith = function(userId, permission = 'View', expiresInDays = null) {
  // Remove existing share for this user
  this.sharedWith = this.sharedWith.filter(shared => 
    shared.userId.toString() !== userId.toString()
  );

  const shareEntry = {
    userId,
    permission,
    sharedAt: new Date()
  };

  if (expiresInDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    shareEntry.expiresAt = expiresAt;
  }

  this.sharedWith.push(shareEntry);
  return this.save();
};

// Static method to find documents by user
documentSchema.statics.findByUser = function(userId, options = {}) {
  const {
    category,
    status = 'Active',
    limit = 20,
    skip = 0,
    sort = { uploadedAt: -1 }
  } = options;

  const query = { userId, status };
  if (category) {
    query['metadata.category'] = category;
  }

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .select('-accessLogs -security.downloadRestrictions');
};

// Static method to find documents by application
documentSchema.statics.findByApplication = function(applicationId) {
  return this.find({ applications: applicationId })
    .select('-accessLogs -security.downloadRestrictions');
};

// Static method to get document statistics
documentSchema.statics.getDocumentStats = async function(userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Active' } },
    {
      $group: {
        _id: '$metadata.category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileInfo.fileSize' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        totalSize: { $sum: '$totalSize' },
        byCategory: {
          $push: {
            category: '$_id',
            count: '$count',
            size: '$totalSize'
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || { total: 0, totalSize: 0, byCategory: [] };
};

// Static method to clean up expired documents
documentSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  
  const expiredDocs = await this.find({
    'metadata.expiresAt': { $lt: now },
    status: 'Active'
  });

  for (const doc of expiredDocs) {
    doc.status = 'Archived';
    await doc.save();
  }

  return expiredDocs.length;
};

// Static method to find documents requiring virus scan
documentSchema.statics.findPendingScans = function() {
  return this.find({
    'security.scanStatus': 'Pending',
    status: 'Active'
  }).sort({ uploadedAt: 1 });
};

// Export the model
const Document = mongoose.model('Document', documentSchema);

module.exports = Document;