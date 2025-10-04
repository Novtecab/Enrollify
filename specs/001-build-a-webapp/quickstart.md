# UniApply Hub - Quick Start Guide

**Purpose**: Step-by-step guide to set up, run, and test the UniApply Hub application

## Prerequisites

### System Requirements
- Node.js 18.0+ and npm 9.0+
- MongoDB 6.0+ (local installation or MongoDB Atlas)
- Git for version control
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Development Tools (Recommended)
- Visual Studio Code with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - Thunder Client (for API testing)
- MongoDB Compass for database management
- Postman or Insomnia for API testing

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd uniapply-hub

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

**Backend Environment (.env file in /backend):**
```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/uniapply-hub-dev
MONGODB_TEST_URI=mongodb://localhost:27017/uniapply-hub-test

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secure-access-secret-key-change-in-production
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# File Upload Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$hashedPasswordHere
```

**Frontend Environment (.env file in /frontend):**
```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_ENVIRONMENT=development

# File Upload Configuration
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png

# Feature Flags
REACT_APP_ENABLE_REAL_TIME_MESSAGING=false
REACT_APP_ENABLE_DARK_MODE=true
REACT_APP_ENABLE_ANALYTICS=false

# Third-party Integrations
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

### 3. Database Setup

```bash
# Start MongoDB (if running locally)
mongod --dbpath /path/to/your/data/directory

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in backend/.env with your Atlas connection string
```

### 4. Seed Initial Data

```bash
# Navigate to backend directory
cd backend

# Run database seeder script
npm run seed

# This will create:
# - 100+ sample universities across regions
# - Admin user with default credentials
# - Sample document categories
# - Test user accounts (optional)
```

## Running the Application

### Development Mode

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev

# Server will start on http://localhost:3000
# API endpoints available at http://localhost:3000/api
# Swagger documentation at http://localhost:3000/api-docs
```

**Terminal 2 - Frontend Development Server:**
```bash
cd frontend
npm start

# React app will start on http://localhost:3001
# Auto-opens in browser with hot reload enabled
```

**Terminal 3 - Database Monitoring (Optional):**
```bash
# Connect to MongoDB shell
mongosh uniapply-hub-dev

# Or use MongoDB Compass GUI
# Connection string: mongodb://localhost:27017
```

### Production Build

```bash
# Build frontend for production
cd frontend
npm run build

# Start backend in production mode
cd ../backend
npm run start

# Frontend build files served by backend at http://localhost:3000
```

## Testing the Application

### 1. Backend API Tests

```bash
cd backend

# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Test coverage report
npm run test:coverage
```

### 2. Frontend Tests

```bash
cd frontend

# Run component tests
npm run test

# Run E2E tests with Cypress
npm run test:e2e

# Visual regression tests
npm run test:visual
```

### 3. Manual Testing Scenarios

**User Registration and Authentication:**
1. Navigate to http://localhost:3001
2. Click "Sign Up" and create a new account
3. Verify email validation and password requirements
4. Log in with created credentials
5. Verify JWT tokens in browser localStorage
6. Test logout functionality

**Profile Management:**
1. Complete user profile with personal information
2. Add academic background entries
3. Add work experience entries
4. Upload sample documents (CV, transcript)
5. Verify profile completion percentage updates

**University Search and Applications:**
1. Browse universities by region and field of study
2. Filter results by country and program type
3. View university details and program information
4. Start a new application for selected university
5. Submit application with required documents
6. Track application status changes

**Administrative Functions:**
1. Log in as admin (username: admin, password: securepass123)
2. View statistics dashboard with user metrics
3. Review submitted applications
4. Update application statuses
5. Send messages to users
6. Test broadcast messaging functionality

## API Testing with Postman/Thunder Client

### Import API Collection
1. Import OpenAPI specifications from `/specs/001-build-a-webapp/contracts/`
2. Set base URL to `http://localhost:3000/api`
3. Configure authentication with JWT tokens

### Sample API Requests

**User Registration:**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123",
  "firstName": "Test",
  "lastName": "User",
  "acceptTerms": true
}
```

**University Search:**
```http
GET http://localhost:3000/api/universities?country=USA&field=Computer Science&page=1&limit=10
Authorization: Bearer your_jwt_token_here
```

**File Upload:**
```http
POST http://localhost:3000/api/uploads
Authorization: Bearer your_jwt_token_here
Content-Type: multipart/form-data

file: [select your file]
category: CV
description: Updated resume
```

## Troubleshooting

### Common Issues and Solutions

**Backend Won't Start:**
- Check MongoDB is running and accessible
- Verify environment variables are set correctly
- Ensure port 3000 is not in use by another application
- Check Node.js version (must be 18.0+)

**Frontend Build Errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Verify React version compatibility
- Check for syntax errors in JSX files
- Ensure all imports are properly resolved

**Database Connection Issues:**
- Verify MongoDB is running: `mongosh --eval "db.adminCommand('ping')"`
- Check connection string format in environment variables
- Ensure database user has proper permissions (if using authentication)
- Test connectivity with MongoDB Compass

**File Upload Problems:**
- Verify Cloudinary credentials are correct
- Check file size limits (10MB maximum)
- Ensure file types are in allowed list
- Test with smaller files first

**Authentication Issues:**
- Check JWT secret keys are set in environment
- Verify token expiration times
- Clear browser localStorage and cookies
- Test with fresh user registration

### Performance Optimization

**Backend Performance:**
- Enable MongoDB connection pooling
- Add proper database indexes
- Implement response caching for static data
- Use compression middleware for API responses

**Frontend Performance:**
- Enable code splitting for large components
- Implement lazy loading for routes
- Optimize image sizes and formats
- Use React.memo for expensive components

### Security Checklist

**Before Production Deployment:**
- [ ] Change all default passwords and secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for production domains only
- [ ] Enable rate limiting and DDoS protection
- [ ] Set up proper backup and recovery procedures
- [ ] Configure monitoring and alerting
- [ ] Run security audit: `npm audit`
- [ ] Test file upload security with various file types

## Development Workflow

### 1. Feature Development
1. Create feature branch from main
2. Update API contracts if needed
3. Write tests first (TDD approach)
4. Implement backend endpoints
5. Create frontend components
6. Run full test suite
7. Create pull request with documentation

### 2. Database Changes
1. Create migration scripts for schema changes
2. Test migrations on development data
3. Update data models and API contracts
4. Regenerate API documentation
5. Update seed scripts if necessary

### 3. Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Static assets optimized
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Documentation updated

## Support and Resources

### Documentation Links
- [API Documentation](http://localhost:3000/api-docs) (when backend is running)
- [React Documentation](https://reactjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide)
- [MongoDB Manual](https://docs.mongodb.com/manual)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Getting Help
- Check console logs for detailed error messages
- Review API response status codes and error messages
- Use browser developer tools for frontend debugging
- Monitor MongoDB logs for database issues
- Reference constitutional requirements for code quality standards

---

**Quick Start Status**: ✅ COMPLETE  
**Next Steps**: Ready for task generation with `/tasks` command  
**Estimated Setup Time**: 30-45 minutes for experienced developers