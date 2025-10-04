# Data Model Design - UniApply Hub

**Date**: 2024-10-04  
**Purpose**: Define database schemas and entity relationships

## Entity Relationship Overview

```
User (1) ──── (M) Application (M) ──── (1) University
 │                     │
 │                     │
 └── (1:M) Document    └── (1:M) ApplicationDocument
 │
 └── (1:M) Message ──── (M:1) Admin
```

## Core Entities

### User Entity
**Purpose**: Represents student accounts with complete academic profiles

**Schema Structure**:
```
User {
  _id: ObjectId (Primary Key)
  email: String (Unique, Required)
  passwordHash: String (Required)
  sessionId: String (Indexed)
  createdAt: Date
  lastLoginAt: Date
  
  // Profile Information
  profile: {
    personalInfo: {
      firstName: String (Required)
      lastName: String (Required)
      dateOfBirth: Date
      nationality: String
      phone: String
      address: {
        street: String
        city: String
        state: String
        country: String
        postalCode: String
      }
    }
    
    academicBackground: [{
      institutionName: String (Required)
      degree: String (Required)
      fieldOfStudy: String
      gpa: Number (0-4.0 scale)
      startDate: Date
      endDate: Date
      isCurrentlyEnrolled: Boolean
    }]
    
    workExperience: [{
      company: String
      position: String
      description: String
      startDate: Date
      endDate: Date
      isCurrentPosition: Boolean
    }]
    
    skills: [String]
    languages: [{
      language: String
      proficiency: String (enum: ['Basic', 'Intermediate', 'Advanced', 'Native'])
    }]
    
    contactPreferences: {
      emailNotifications: Boolean (default: true)
      smsNotifications: Boolean (default: false)
      marketingEmails: Boolean (default: false)
    }
  }
  
  profileCompletionStatus: {
    personalInfo: Boolean
    academicBackground: Boolean
    documents: Boolean
    contactPreferences: Boolean
    overallCompletion: Number (0-100)
  }
}
```

**Indexes**:
- email (unique)
- sessionId
- "profile.personalInfo.lastName", "profile.personalInfo.firstName"

**Validation Rules**:
- Email must be valid format
- Password minimum 8 characters
- GPA between 0.0 and 4.0
- Phone number format validation
- Required fields for profile completion

### University Entity
**Purpose**: Represents educational institutions with program information

**Schema Structure**:
```
University {
  _id: ObjectId (Primary Key)
  name: String (Required, Indexed)
  country: String (Required, Indexed)
  region: String (Required, Indexed) // Europe, USA, GCC, Pakistan
  
  details: {
    website: String
    description: String
    establishedYear: Number
    ranking: {
      global: Number
      national: Number
      source: String
    }
    location: {
      city: String
      state: String
      coordinates: {
        latitude: Number
        longitude: Number
      }
    }
  }
  
  programs: [{
    name: String (Required)
    level: String (enum: ['Bachelors', 'Masters', 'PhD', 'Certificate'])
    department: String
    fieldsOfStudy: [String] (Indexed)
    duration: {
      years: Number
      months: Number
    }
    requirements: {
      minGPA: Number
      languageRequirements: [String]
      standardizedTests: [String]
      documents: [String]
    }
    deadlines: {
      applicationDeadline: Date
      documentDeadline: Date
      decisionDate: Date
    }
    fees: {
      tuition: Number
      application: Number
      currency: String
    }
    isActive: Boolean (default: true)
  }]
  
  contactInfo: {
    admissionsEmail: String
    phone: String
    address: String
  }
  
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- name (text search)
- country, region (compound)
- "programs.fieldsOfStudy" (multikey)
- "programs.deadlines.applicationDeadline"

### Application Entity
**Purpose**: Tracks student applications to university programs

**Schema Structure**:
```
Application {
  _id: ObjectId (Primary Key)
  userId: ObjectId (Required, Indexed)
  universityId: ObjectId (Required, Indexed)
  programId: ObjectId (Required)
  
  applicationData: {
    personalStatement: String
    references: [{
      refereeeName: String
      refereeEmail: String
      relationship: String
      submittedAt: Date
      status: String (enum: ['Pending', 'Submitted', 'Declined'])
    }]
    additionalDocuments: [ObjectId] // References to Document collection
    
    responses: [{
      question: String
      answer: String
      type: String (enum: ['text', 'essay', 'multiple_choice'])
    }]
  }
  
  status: String (enum: ['Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected', 'Waitlisted'])
  statusHistory: [{
    status: String
    changedAt: Date
    changedBy: ObjectId (Admin ID)
    notes: String
  }]
  
  submittedAt: Date
  lastModifiedAt: Date
  deadlines: {
    application: Date
    documents: Date
  }
  
  adminNotes: [{
    note: String
    createdBy: ObjectId (Admin ID)
    createdAt: Date
    isInternal: Boolean (default: true)
  }]
  
  priority: String (enum: ['Low', 'Medium', 'High'])
  tags: [String]
}
```

**Indexes**:
- userId, status (compound)
- universityId, status (compound)
- submittedAt
- "deadlines.application"

### Document Entity
**Purpose**: Manages uploaded files with metadata and access controls

**Schema Structure**:
```
Document {
  _id: ObjectId (Primary Key)
  userId: ObjectId (Required, Indexed)
  
  fileInfo: {
    originalName: String (Required)
    fileName: String (Required) // Sanitized filename
    fileType: String (Required) // MIME type
    fileExtension: String
    fileSize: Number (Required) // Bytes
    checksum: String // File integrity verification
  }
  
  storage: {
    provider: String (Required) // 'cloudinary', 's3', etc.
    publicId: String // Provider-specific ID
    url: String (Required) // Access URL
    secureUrl: String // HTTPS URL
    thumbnailUrl: String // For image previews
  }
  
  metadata: {
    category: String (enum: ['CV', 'Transcript', 'Degree', 'Recommendation', 'Portfolio', 'Other'])
    description: String
    tags: [String]
    isPublic: Boolean (default: false)
    expiresAt: Date // For temporary documents
  }
  
  uploadedAt: Date
  lastAccessedAt: Date
  
  security: {
    scanStatus: String (enum: ['Pending', 'Clean', 'Infected', 'Error'])
    scanDate: Date
    accessCount: Number (default: 0)
    downloadRestrictions: {
      maxDownloads: Number
      allowedIPs: [String]
    }
  }
  
  applications: [ObjectId] // Applications using this document
}
```

**Indexes**:
- userId, "metadata.category" (compound)
- "storage.publicId" (unique)
- uploadedAt
- "security.scanStatus"

### Message Entity
**Purpose**: Handles communication between admins and users

**Schema Structure**:
```
Message {
  _id: ObjectId (Primary Key)
  
  participants: {
    from: {
      type: String (enum: ['admin', 'user'])
      id: ObjectId // Admin ID or User ID
      name: String
      email: String
    }
    to: {
      type: String (enum: ['user', 'broadcast', 'group'])
      id: ObjectId // User ID (if individual message)
      criteria: Object // For broadcast/group messages
    }
  }
  
  content: {
    subject: String (Required)
    body: String (Required)
    htmlBody: String // Rich text version
    attachments: [ObjectId] // References to Document collection
    messageType: String (enum: ['notification', 'inquiry', 'update', 'marketing'])
  }
  
  metadata: {
    priority: String (enum: ['Low', 'Normal', 'High', 'Urgent'])
    category: String (enum: ['Application', 'Document', 'General', 'Technical'])
    threadId: ObjectId // For message threading
    replyToId: ObjectId // Parent message reference
  }
  
  status: {
    sent: Boolean (default: true)
    delivered: Boolean (default: false)
    read: Boolean (default: false)
    readAt: Date
    deliveredAt: Date
  }
  
  sentAt: Date
  scheduledFor: Date // For scheduled messages
  expiresAt: Date // For time-sensitive messages
  
  analytics: {
    openCount: Number (default: 0)
    clickCount: Number (default: 0)
    lastOpenAt: Date
  }
}
```

**Indexes**:
- "participants.to.id", "sentAt" (compound)
- "participants.from.id", "sentAt" (compound)
- "metadata.threadId"
- "status.read", "sentAt" (compound)

### Admin Entity
**Purpose**: Represents administrative users with elevated permissions

**Schema Structure**:
```
Admin {
  _id: ObjectId (Primary Key)
  username: String (Required, Unique)
  email: String (Required, Unique)
  passwordHash: String (Required)
  
  profile: {
    firstName: String
    lastName: String
    department: String
    role: String (enum: ['SuperAdmin', 'ApplicationReviewer', 'Support', 'ReadOnly'])
  }
  
  permissions: {
    canViewApplications: Boolean
    canEditApplications: Boolean
    canViewStatistics: Boolean
    canSendMessages: Boolean
    canManageUsers: Boolean
    canManageUniversities: Boolean
    canAccessAuditLogs: Boolean
  }
  
  sessionInfo: {
    currentSession: String
    lastLoginAt: Date
    lastActivityAt: Date
    loginCount: Number (default: 0)
  }
  
  preferences: {
    dashboardLayout: Object
    notificationSettings: Object
    timezone: String
  }
  
  createdAt: Date
  isActive: Boolean (default: true)
  createdBy: ObjectId // Reference to creating admin
}
```

**Indexes**:
- username (unique)
- email (unique)
- "profile.role"
- isActive

## Relationships and References

### User ↔ Application (One-to-Many)
- User can have multiple applications
- Application belongs to one user
- Cascade delete: Delete applications when user is deleted

### University ↔ Application (One-to-Many)
- University can have multiple applications
- Application targets one university program
- Soft delete: Mark applications as inactive when university is removed

### User ↔ Document (One-to-Many)
- User can upload multiple documents
- Document belongs to one user
- Access control: Users can only access their own documents

### Application ↔ Document (Many-to-Many)
- Applications can reference multiple documents
- Documents can be used in multiple applications
- Junction managed through Application.applicationData.additionalDocuments

### Admin ↔ Message (One-to-Many)
- Admin can send multiple messages
- Message can originate from one admin
- Audit trail: Maintain message history even if admin is deactivated

## Data Validation Rules

### Profile Completion Requirements
- Personal Info: firstName, lastName, email (30% weight)
- Academic Background: At least one degree entry (25% weight)
- Documents: At least CV uploaded (25% weight)
- Contact Preferences: All fields set (20% weight)

### Application Submission Requirements
- Profile must be at least 80% complete
- Required documents must be uploaded and virus-scanned
- All mandatory application fields must be filled
- Application deadline must not have passed

### File Upload Restrictions
- Maximum file size: 10MB
- Allowed types: PDF, DOCX, DOC, JPG, JPEG, PNG
- Virus scanning required before storage
- Filename sanitization to prevent path traversal

### Security Constraints
- Passwords: Minimum 8 characters, mixed case, numbers
- Session tokens: 15-minute expiration for access tokens
- File access: Signed URLs with 1-hour expiration
- Rate limiting: API calls limited by IP and user

---

**Data Model Status**: ✅ COMPLETE
**Next Phase**: API contract design
**Entities Defined**: 6 core entities with full schemas
**Relationships Mapped**: All entity relationships documented