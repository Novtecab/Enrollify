const request = require('supertest');
const app = require('../../src/app');

describe('API Performance Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Register and login a test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'performance@example.com',
        password: 'SecurePass123',
        firstName: 'Performance',
        lastName: 'Test',
        acceptTerms: true
      });

    authToken = registerResponse.body.tokens.accessToken;
  });

  describe('API Response Time Requirements (<200ms)', () => {
    it('should respond to authentication endpoints within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'performance@example.com',
          password: 'SecurePass123'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond to profile endpoints within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond to dashboard endpoints within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond to university search within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/universities?country=USA&page=1&limit=10')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent requests within performance limits', async () => {
      const startTime = Date.now();
      
      const requests = Array(10).fill().map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      const averageResponseTime = totalTime / responses.length;
      expect(averageResponseTime).toBeLessThan(300);
    });

    it('should handle 50 concurrent authentication requests', async () => {
      const startTime = Date.now();
      
      const requests = Array(50).fill().map((_, index) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `concurrent${index}@example.com`,
            password: 'SecurePass123',
            firstName: 'Concurrent',
            lastName: `User${index}`,
            acceptTerms: true
          })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 requests
    });
  });

  describe('Memory Usage Validation', () => {
    it('should not cause memory leaks during repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform 100 requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseInMB = memoryIncrease / 1024 / 1024;

      // Memory increase should be reasonable (less than 50MB for 100 requests)
      expect(memoryIncreaseInMB).toBeLessThan(50);
    });
  });

  describe('Database Query Performance', () => {
    it('should execute user queries efficiently', async () => {
      // Create multiple test users to simulate database load
      const createUserPromises = Array(20).fill().map((_, index) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `dbtest${index}@example.com`,
            password: 'SecurePass123',
            firstName: 'DB',
            lastName: `Test${index}`,
            acceptTerms: true
          })
      );

      await Promise.all(createUserPromises);

      // Now test query performance
      const startTime = Date.now();
      
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(100); // Database queries should be very fast
    });

    it('should handle university search with filtering efficiently', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/universities?country=USA&field=Computer Science&page=1&limit=20')
        .expect(200);

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(150); // Complex search should still be fast
    });
  });

  describe('Payload Size Limits', () => {
    it('should handle large profile updates efficiently', async () => {
      const largeProfileUpdate = {
        personalInfo: {
          firstName: 'Large',
          lastName: 'Profile',
          dateOfBirth: '1990-01-01',
          nationality: 'United States',
          phone: '+1-555-123-4567',
          address: {
            street: '123 Very Long Street Name With Many Words',
            city: 'A Very Long City Name',
            state: 'State',
            country: 'United States',
            postalCode: '12345'
          }
        },
        skills: Array(50).fill().map((_, i) => `Skill ${i + 1}`),
        languages: [
          { language: 'English', proficiency: 'Native' },
          { language: 'Spanish', proficiency: 'Advanced' },
          { language: 'French', proficiency: 'Intermediate' },
          { language: 'German', proficiency: 'Basic' }
        ],
        academicBackground: Array(5).fill().map((_, i) => ({
          institutionName: `University ${i + 1}`,
          degree: `Degree ${i + 1}`,
          fieldOfStudy: `Field ${i + 1}`,
          gpa: 3.5,
          startDate: '2020-09-01',
          endDate: '2024-06-15',
          isCurrentlyEnrolled: false
        })),
        workExperience: Array(10).fill().map((_, i) => ({
          company: `Company ${i + 1}`,
          position: `Position ${i + 1}`,
          description: `A very detailed description of work experience at company ${i + 1} that includes many details about responsibilities and achievements.`,
          startDate: '2022-01-01',
          endDate: '2023-12-31',
          isCurrentPosition: false
        }))
      };

      const startTime = Date.now();
      
      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeProfileUpdate)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // Larger payload, but still reasonable
    });
  });
});