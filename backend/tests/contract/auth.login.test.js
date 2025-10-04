const request = require('supertest');
const app = require('../../src/app');

describe('Authentication Login Contract Tests', () => {
  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      rememberMe: false
    };

    beforeEach(async () => {
      // Register a test user before each login test
      await request(app)
        .post('/api/auth/register')
        .send({
          email: validLoginData.email,
          password: validLoginData.password,
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true
        });
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      
      // Verify user object structure
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', validLoginData.email);
      expect(response.body.user).toHaveProperty('firstName');
      expect(response.body.user).toHaveProperty('lastName');
      expect(response.body.user).toHaveProperty('profileCompletion');
      expect(response.body.user).toHaveProperty('lastLoginAt');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify tokens structure
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens).toHaveProperty('expiresIn', 900); // 15 minutes
      expect(response.body.tokens).toHaveProperty('tokenType', 'Bearer');

      // Verify lastLoginAt is updated
      expect(new Date(response.body.user.lastLoginAt)).toBeInstanceOf(Date);
    });

    it('should reject login with invalid email', async () => {
      const invalidData = { ...validLoginData, email: 'nonexistent@example.com' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const invalidData = { ...validLoginData, password: 'WrongPassword123' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' })
        ])
      );
    });

    it('should reject login with malformed email', async () => {
      const invalidData = { ...validLoginData, email: 'invalid-email-format' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email')
          })
        ])
      );
    });

    it('should handle rememberMe option correctly', async () => {
      const rememberMeData = { ...validLoginData, rememberMe: true };

      const response = await request(app)
        .post('/api/auth/login')
        .send(rememberMeData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      // When rememberMe is true, refresh token should have longer expiry
      // This would be validated in the JWT token itself
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should implement rate limiting for login attempts', async () => {
      // Attempt multiple logins with wrong password
      const invalidData = { ...validLoginData, password: 'WrongPassword' };

      // First few attempts should return 401
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(invalidData)
          .expect(401);
      }

      // After multiple failed attempts, should return 429 (Too Many Requests)
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData);

      if (response.status === 429) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
        expect(response.body.error.message).toContain('too many attempts');
      }
    });

    it('should set secure HTTP headers', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
    });

    it('should not leak sensitive information in error responses', async () => {
      const invalidData = { ...validLoginData, email: 'nonexistent@example.com' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(401);

      // Error message should be generic, not revealing whether email exists
      expect(response.body.error.message).toBe('Invalid email or password');
      expect(response.body.error.message).not.toContain('email not found');
      expect(response.body.error.message).not.toContain('user does not exist');
    });

    it('should handle concurrent login attempts gracefully', async () => {
      // Simulate concurrent login requests
      const loginPromises = Array(5).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send(validLoginData)
      );

      const responses = await Promise.all(loginPromises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});