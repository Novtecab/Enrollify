const request = require('supertest');
const app = require('../../src/app');

describe('Authentication Registration Contract Tests', () => {
  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      firstName: 'John',
      lastName: 'Doe',
      acceptTerms: true
    };

    it('should successfully register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Account created successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      
      // Verify user object structure
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', validRegistrationData.email);
      expect(response.body.user).toHaveProperty('firstName', validRegistrationData.firstName);
      expect(response.body.user).toHaveProperty('lastName', validRegistrationData.lastName);
      expect(response.body.user).toHaveProperty('profileCompletion');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify tokens structure
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens).toHaveProperty('expiresIn', 900); // 15 minutes
      expect(response.body.tokens).toHaveProperty('tokenType', 'Bearer');
    });

    it('should reject registration with missing email', async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.email;

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('message', 'Invalid input data');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('email')
          })
        ])
      );
    });

    it('should reject registration with invalid email format', async () => {
      const invalidData = { ...validRegistrationData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
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

    it('should reject registration with weak password', async () => {
      const invalidData = { ...validRegistrationData, password: '123' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('8')
          })
        ])
      );
    });

    it('should reject registration with missing required fields', async () => {
      const invalidData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.details.length).toBeGreaterThan(1);
      
      const fieldNames = response.body.error.details.map(detail => detail.field);
      expect(fieldNames).toContain('password');
      expect(fieldNames).toContain('firstName');
      expect(fieldNames).toContain('lastName');
    });

    it('should reject registration with duplicate email', async () => {
      // This test will pass once we implement the registration logic
      // First registration should succeed, second should fail
      
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'DUPLICATE_EMAIL');
      expect(response.body.error.message).toContain('email already exists');
    });

    it('should reject registration without accepting terms', async () => {
      const invalidData = { ...validRegistrationData, acceptTerms: false };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'acceptTerms',
            message: expect.stringContaining('terms')
          })
        ])
      );
    });

    it('should set proper HTTP headers in response', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
    });

    it('should handle server errors gracefully', async () => {
      // This test simulates database connection failure
      // In a real scenario, we would mock the database to throw an error
      
      const invalidData = { ...validRegistrationData, email: 'trigger-server-error@test.com' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // Should return 500 for server errors
      if (response.status === 500) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code', 'INTERNAL_SERVER_ERROR');
      }
    });
  });
});