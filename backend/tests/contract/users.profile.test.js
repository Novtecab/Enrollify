const request = require('supertest');
const app = require('../../src/app');

describe('User Profile Contract Tests', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Register and login a test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      });

    authToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  describe('GET /api/users/profile', () => {
    it('should return complete user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      
      const user = response.body.user;
      expect(user).toHaveProperty('id', userId);
      expect(user).toHaveProperty('email', 'test@example.com');
      expect(user).toHaveProperty('personalInfo');
      expect(user).toHaveProperty('academicBackground');
      expect(user).toHaveProperty('workExperience');
      expect(user).toHaveProperty('skills');
      expect(user).toHaveProperty('languages');
      expect(user).toHaveProperty('contactPreferences');
      expect(user).toHaveProperty('profileCompletion');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('lastLoginAt');

      // Verify nested structures
      expect(user.personalInfo).toHaveProperty('firstName', 'John');
      expect(user.personalInfo).toHaveProperty('lastName', 'Doe');
      expect(Array.isArray(user.academicBackground)).toBe(true);
      expect(Array.isArray(user.workExperience)).toBe(true);
      expect(Array.isArray(user.skills)).toBe(true);
      expect(Array.isArray(user.languages)).toBe(true);
      
      // Verify profile completion structure
      expect(user.profileCompletion).toHaveProperty('personalInfo');
      expect(user.profileCompletion).toHaveProperty('academicBackground');
      expect(user.profileCompletion).toHaveProperty('documents');
      expect(user.profileCompletion).toHaveProperty('contactPreferences');
      expect(user.profileCompletion).toHaveProperty('overallCompletion');
      expect(typeof user.profileCompletion.overallCompletion).toBe('number');
    });

    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error.message).toContain('authentication required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_TOKEN');
    });

    it('should reject request with expired token', async () => {
      // This would test with a pre-expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0YTdiOGM5ZDFlMmYzZzRoNWk2ajdrOCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxNjIwMDAwMDAxfQ.invalid';
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'TOKEN_EXPIRED');
    });
  });

  describe('PUT /api/users/profile', () => {
    const validProfileUpdate = {
      personalInfo: {
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1995-05-15',
        nationality: 'United States',
        phone: '+1-555-123-4567',
        address: {
          street: '123 Main Street',
          city: 'New York',
          state: 'NY',
          country: 'United States',
          postalCode: '10001'
        }
      },
      skills: ['JavaScript', 'Python', 'Data Analysis'],
      languages: [
        { language: 'English', proficiency: 'Native' },
        { language: 'Spanish', proficiency: 'Advanced' }
      ],
      contactPreferences: {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: false
      }
    };

    it('should successfully update user profile with valid data', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProfileUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body).toHaveProperty('user');

      const user = response.body.user;
      expect(user.personalInfo.firstName).toBe(validProfileUpdate.personalInfo.firstName);
      expect(user.personalInfo.lastName).toBe(validProfileUpdate.personalInfo.lastName);
      expect(user.personalInfo.phone).toBe(validProfileUpdate.personalInfo.phone);
      expect(user.skills).toEqual(validProfileUpdate.skills);
      expect(user.languages).toEqual(validProfileUpdate.languages);
      expect(user.contactPreferences).toEqual(validProfileUpdate.contactPreferences);
    });

    it('should reject profile update without authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send(validProfileUpdate)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should validate phone number format', async () => {
      const invalidUpdate = {
        ...validProfileUpdate,
        personalInfo: {
          ...validProfileUpdate.personalInfo,
          phone: 'invalid-phone'
        }
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'personalInfo.phone',
            message: expect.stringContaining('phone')
          })
        ])
      );
    });

    it('should validate date of birth format', async () => {
      const invalidUpdate = {
        ...validProfileUpdate,
        personalInfo: {
          ...validProfileUpdate.personalInfo,
          dateOfBirth: 'invalid-date'
        }
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'personalInfo.dateOfBirth',
            message: expect.stringContaining('date')
          })
        ])
      );
    });

    it('should validate language proficiency values', async () => {
      const invalidUpdate = {
        ...validProfileUpdate,
        languages: [
          { language: 'French', proficiency: 'Invalid' }
        ]
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'languages.0.proficiency',
            message: expect.stringContaining('Basic, Intermediate, Advanced, Native')
          })
        ])
      );
    });

    it('should update profile completion percentage', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProfileUpdate)
        .expect(200);

      const user = response.body.user;
      expect(user.profileCompletion.personalInfo).toBe(true);
      expect(user.profileCompletion.overallCompletion).toBeGreaterThan(0);
      expect(user.profileCompletion.overallCompletion).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/users/dashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('dashboard');

      const dashboard = response.body.dashboard;
      expect(dashboard).toHaveProperty('profileCompletion');
      expect(dashboard).toHaveProperty('applications');
      expect(dashboard).toHaveProperty('documents');
      expect(dashboard).toHaveProperty('notifications');
      expect(dashboard).toHaveProperty('upcomingDeadlines');

      // Verify applications summary structure
      expect(dashboard.applications).toHaveProperty('total');
      expect(dashboard.applications).toHaveProperty('draft');
      expect(dashboard.applications).toHaveProperty('submitted');
      expect(dashboard.applications).toHaveProperty('underReview');
      expect(dashboard.applications).toHaveProperty('accepted');
      expect(dashboard.applications).toHaveProperty('rejected');

      // Verify documents summary structure
      expect(dashboard.documents).toHaveProperty('total');
      expect(dashboard.documents).toHaveProperty('categories');

      // Verify notifications summary
      expect(dashboard.notifications).toHaveProperty('unread');
      expect(dashboard.notifications).toHaveProperty('total');

      // Verify upcoming deadlines is an array
      expect(Array.isArray(dashboard.upcomingDeadlines)).toBe(true);
    });
  });
});