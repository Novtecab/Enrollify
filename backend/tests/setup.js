const { MongoMemoryServer } = require('mongodb-memory-server');
const database = require('../src/utils/database');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB for testing
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to test database
  await database.connect(mongoUri);
  
  console.log('🧪 Test database connected');
});

// Cleanup after each test
afterEach(async () => {
  if (process.env.NODE_ENV === 'test') {
    await database.clearDatabase();
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await database.disconnect();
  
  // Stop in-memory MongoDB
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('🧪 Test database disconnected');
});

// Global test configuration
jest.setTimeout(30000); // 30 seconds timeout for all tests

// Mock console.log to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep error logs for debugging
};