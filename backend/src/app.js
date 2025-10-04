const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

/**
 * Express Application Configuration
 * 
 * This file sets up the main Express application with security middleware,
 * route handlers, and error handling following constitutional requirements.
 * 
 * Constitutional Requirements:
 * - Security headers and CORS configuration
 * - Rate limiting for abuse prevention
 * - Comprehensive error handling with user-friendly messages
 * - Performance optimization through compression
 * - Proper logging for debugging and monitoring
 */

const app = express();

// Trust proxy if behind reverse proxy (for rate limiting)
app.set('trust proxy', 1);

// Security middleware - Constitutional requirement for security standards
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration - Allow frontend access
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count']
}));

// Compression middleware for performance
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Rate limiting middleware - Constitutional requirement for abuse prevention
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// More strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    }
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes will be added here
// Authentication routes with stricter rate limiting
app.use('/api/auth', authLimiter); // Apply auth rate limiting first

// Import and use route handlers (these will be created in subsequent tasks)
try {
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const universityRoutes = require('./routes/universities');
  const applicationRoutes = require('./routes/applications');
  const uploadRoutes = require('./routes/uploads');
  const adminRoutes = require('./routes/admin');
  const messageRoutes = require('./routes/messages');

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/universities', universityRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/messages', messageRoutes);
} catch (error) {
  // Routes not yet implemented - this is expected during TDD
  console.log('Routes not yet implemented - continuing with basic app setup');
}

// API documentation endpoint (Swagger)
if (process.env.NODE_ENV !== 'production') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./docs/swagger');
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  } catch (error) {
    console.log('Swagger documentation not yet configured');
  }
}

// Catch-all for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Default route for non-API requests
app.get('*', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'UniApply Hub API Server',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// Global error handling middleware - Constitutional requirement for user-friendly errors
app.use((error, req, res, next) => {
  console.error('Error:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    // Mongoose validation errors
    const details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details
      }
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format'
      }
    });
  }

  if (error.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_VALUE',
        message: `${field} already exists`
      }
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      }
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired'
      }
    });
  }

  if (error.status === 413) {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload too large'
      }
    });
  }

  // Default error response
  const status = error.status || error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred while processing your request'
    : error.message;

  res.status(status).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message
    }
  });
});

// Handle 404 errors for all other routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

module.exports = app;