const mongoose = require('mongoose');

/**
 * Message Model - Handles communication between admins and users
 * 
 * This model manages messaging system including direct messages, broadcasts,
 * threading, read receipts, and notification handling.
 * 
 * Constitutional Requirements:
 * - Privacy protection with proper access controls
 * - Message threading and conversation management
 * - Performance optimization for inbox queries
 * - Comprehensive audit trail for communications
 */

// Participant subdocument schema
const participantSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: {
      values: ['admin', 'user'],
      message: 'Participant type must be either admin or user'
    },
    required: [true, 'Participant type is required']
  },
  id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Participant ID is required'],
    refPath: 'participants.type'
  },
  name: {
    type: String,
    required: [true, 'Participant name is required'],
    trim: true,
    maxlength: [100, 'Participant name must be less than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Participant email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  }
}, { _id: false });

// Recipient subdocument schema
const recipientSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: {
      values: ['user', 'broadcast', 'group'],
      message: 'Recipient type must be one of: user, broadcast, group'
    },
    required: [true, 'Recipient type is required']
  },
  id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: function() {
      return this.type === 'user' ? 'User' : null;
    }
  },
  criteria: {
    type: mongoose.Schema.Types.Mixed // For broadcast/group targeting criteria
  }
}, { _id: false });

// Message content subdocument schema
const contentSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Message subject is required'],
    trim: true,
    maxlength: [200, 'Subject must be less than 200 characters']
  },
  body: {
    type: String,
    required: [true, 'Message body is required'],
    trim: true,
    maxlength: [10000, 'Message body must be less than 10000 characters']
  },
  htmlBody: {
    type: String,
    trim: true,
    maxlength: [20000, 'HTML body must be less than 20000 characters']
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  messageType: {
    type: String,
    enum: {
      values: ['notification', 'inquiry', 'update', 'marketing', 'system'],
      message: 'Message type must be one of: notification, inquiry, update, marketing, system'
    },
    default: 'notification'
  }
}, { _id: false });

// Message metadata subdocument schema
const metadataSchema = new mongoose.Schema({
  priority: {
    type: String,
    enum: {
      values: ['Low', 'Normal', 'High', 'Urgent'],
      message: 'Priority must be one of: Low, Normal, High, Urgent'
    },
    default: 'Normal'
  },
  category: {
    type: String,
    enum: {
      values: ['Application', 'Document', 'General', 'Technical', 'Account'],
      message: 'Category must be one of: Application, Document, General, Technical, Account'
    },
    default: 'General'
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  replyToId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag must be less than 50 characters']
  }],
  internalReference: {
    type: String,
    trim: true,
    maxlength: [100, 'Internal reference must be less than 100 characters']
  }
}, { _id: false });

// Message status subdocument schema
const statusSchema = new mongoose.Schema({
  sent: {
    type: Boolean,
    default: false
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  bounced: {
    type: Boolean,
    default: false
  },
  bounceReason: {
    type: String,
    trim: true
  }
}, { _id: false });

// Analytics subdocument schema
const analyticsSchema = new mongoose.Schema({
  openCount: {
    type: Number,
    default: 0,
    min: [0, 'Open count cannot be negative']
  },
  clickCount: {
    type: Number,
    default: 0,
    min: [0, 'Click count cannot be negative']
  },
  lastOpenAt: {
    type: Date
  },
  lastClickAt: {
    type: Date
  },
  openedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    openedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }]
}, { _id: false });

// Main Message schema
const messageSchema = new mongoose.Schema({
  // Participants
  participants: {
    from: participantSchema,
    to: recipientSchema
  },

  // Content
  content: contentSchema,
  metadata: metadataSchema,

  // Status and tracking
  status: statusSchema,
  analytics: analyticsSchema,

  // Timing
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  scheduledFor: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Scheduled time must be in the future'
    }
  },
  expiresAt: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Expiration time must be in the future'
    }
  },

  // Conversation management
  conversationId: {
    type: String,
    index: true
  },
  messageOrder: {
    type: Number,
    default: 1
  },

  // Administrative
  archived: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  reportedAsSpam: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      // Don't expose sensitive analytics data to regular users
      if (ret.analytics && !ret.isAdmin) {
        delete ret.analytics.openedBy;
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Compound indexes for performance optimization
messageSchema.index({ 'participants.to.id': 1, sentAt: -1 });
messageSchema.index({ 'participants.from.id': 1, sentAt: -1 });
messageSchema.index({ 'metadata.threadId': 1, sentAt: 1 });
messageSchema.index({ 'status.read': 1, sentAt: -1 });
messageSchema.index({ conversationId: 1, messageOrder: 1 });
messageSchema.index({ scheduledFor: 1 });
messageSchema.index({ expiresAt: 1 });
messageSchema.index({ 'content.messageType': 1, sentAt: -1 });

// Virtual for message age
messageSchema.virtual('ageInMinutes').get(function() {
  const now = new Date();
  const sent = new Date(this.sentAt);
  return Math.floor((now - sent) / (1000 * 60));
});

// Virtual for expiry status
messageSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
});

// Virtual for scheduled status
messageSchema.virtual('isScheduled').get(function() {
  if (!this.scheduledFor) return false;
  return new Date() < new Date(this.scheduledFor);
});

// Virtual for conversation starter
messageSchema.virtual('isConversationStarter').get(function() {
  return this.messageOrder === 1;
});

// Pre-save middleware to generate conversation ID
messageSchema.pre('save', function(next) {
  if (this.isNew && !this.conversationId) {
    // Generate conversation ID based on participants
    const fromId = this.participants.from.id.toString();
    const toId = this.participants.to.id ? this.participants.to.id.toString() : 'broadcast';
    this.conversationId = [fromId, toId].sort().join('-');
  }
  next();
});

// Pre-save middleware to set thread ID
messageSchema.pre('save', function(next) {
  if (this.isNew && !this.metadata.threadId) {
    if (this.metadata.replyToId) {
      // Get thread ID from parent message
      this.constructor.findById(this.metadata.replyToId)
        .then(parentMessage => {
          if (parentMessage) {
            this.metadata.threadId = parentMessage.metadata.threadId || parentMessage._id;
          }
          next();
        })
        .catch(next);
    } else {
      // This is a new thread
      this.metadata.threadId = this._id;
      next();
    }
  } else {
    next();
  }
});

// Instance method to mark as read
messageSchema.methods.markAsRead = function(userId = null) {
  if (!this.status.read) {
    this.status.read = true;
    this.status.readAt = new Date();
    
    // Track who read the message
    if (userId) {
      this.analytics.openCount += 1;
      this.analytics.lastOpenAt = new Date();
      this.analytics.openedBy.push({
        userId,
        openedAt: new Date()
      });
    }
  }
  
  return this.save();
};

// Instance method to create reply
messageSchema.methods.createReply = function(replyData) {
  const Reply = this.constructor;
  
  const reply = new Reply({
    participants: {
      from: replyData.from,
      to: {
        type: 'user',
        id: this.participants.from.id,
        criteria: null
      }
    },
    content: replyData.content,
    metadata: {
      ...replyData.metadata,
      threadId: this.metadata.threadId || this._id,
      replyToId: this._id
    },
    conversationId: this.conversationId,
    messageOrder: this.messageOrder + 1
  });
  
  return reply.save();
};

// Instance method to archive message
messageSchema.methods.archive = function() {
  this.archived = true;
  return this.save();
};

// Static method to find messages for user inbox
messageSchema.statics.findInbox = function(userId, options = {}) {
  const {
    unreadOnly = false,
    category,
    limit = 20,
    skip = 0,
    sort = { sentAt: -1 }
  } = options;

  const query = {
    'participants.to.id': userId,
    deleted: false,
    archived: false
  };

  if (unreadOnly) {
    query['status.read'] = false;
  }

  if (category) {
    query['metadata.category'] = category;
  }

  return this.find(query)
    .populate('content.attachments', 'fileInfo.originalName fileInfo.fileSize')
    .populate('participants.from.id', 'profile.personalInfo.firstName profile.personalInfo.lastName')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to find conversation thread
messageSchema.statics.findThread = function(threadId, options = {}) {
  const {
    limit = 50,
    sort = { messageOrder: 1 }
  } = options;

  return this.find({
    'metadata.threadId': threadId,
    deleted: false
  })
  .populate('content.attachments', 'fileInfo.originalName fileInfo.fileSize')
  .populate('participants.from.id', 'profile.personalInfo.firstName profile.personalInfo.lastName')
  .sort(sort)
  .limit(limit);
};

// Static method to send broadcast message
messageSchema.statics.sendBroadcast = async function(messageData, criteria = {}) {
  const User = require('./User');
  
  // Find users matching criteria
  const users = await User.find(criteria).select('_id profile.personalInfo email');
  
  const messages = users.map(user => ({
    participants: {
      from: messageData.from,
      to: {
        type: 'user',
        id: user._id
      }
    },
    content: messageData.content,
    metadata: {
      ...messageData.metadata,
      category: messageData.category || 'General'
    }
  }));

  return this.insertMany(messages);
};

// Static method to get message statistics
messageSchema.statics.getMessageStats = async function(filters = {}) {
  const pipeline = [
    { $match: { ...filters, deleted: false } },
    {
      $group: {
        _id: {
          type: '$content.messageType',
          read: '$status.read'
        },
        count: { $sum: 1 },
        avgOpenCount: { $avg: '$analytics.openCount' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        total: { $sum: '$count' },
        read: {
          $sum: {
            $cond: [{ $eq: ['$_id.read', true] }, '$count', 0]
          }
        },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$_id.read', false] }, '$count', 0]
          }
        },
        avgOpenCount: { $avg: '$avgOpenCount' }
      }
    }
  ];

  return this.aggregate(pipeline);
};

// Static method to find scheduled messages
messageSchema.statics.findScheduled = function() {
  return this.find({
    scheduledFor: { $lte: new Date() },
    'status.sent': false,
    deleted: false
  }).sort({ scheduledFor: 1 });
};

// Static method to clean up expired messages
messageSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      expiresAt: { $lt: now },
      deleted: false
    },
    {
      $set: { deleted: true }
    }
  );

  return result.modifiedCount;
};

// Static method to get unread count for user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    'participants.to.id': userId,
    'status.read': false,
    deleted: false,
    archived: false
  });
};

// Export the model
const Message = mongoose.model('Message', messageSchema);

module.exports = Message;