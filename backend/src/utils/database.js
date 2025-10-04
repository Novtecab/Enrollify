const mongoose = require('mongoose');

/**
 * Database connection utility
 * Handles MongoDB connection with proper error handling and configuration
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Connect to MongoDB database
   * @param {string} uri - MongoDB connection URI
   * @returns {Promise<mongoose.Connection>} Database connection
   */
  async connect(uri = process.env.MONGODB_URI) {
    if (!uri) {
      throw new Error('MongoDB URI is required');
    }

    try {
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
      };

      this.connection = await mongoose.connect(uri, options);
      
      console.log(`✅ Connected to MongoDB: ${this.connection.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB database
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      console.log('✅ Disconnected from MongoDB');
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get database connection instance
   * @returns {mongoose.Connection} Database connection
   */
  getConnection() {
    return mongoose.connection;
  }

  /**
   * Clear database (for testing purposes)
   * @returns {Promise<void>}
   */
  async clearDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Database clearing is only allowed in test environment');
    }

    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('🧹 Database cleared for testing');
  }

  /**
   * Setup database indexes for optimal performance
   * @returns {Promise<void>}
   */
  async setupIndexes() {
    try {
      // This will be called after models are loaded
      // Individual models handle their own index creation
      console.log('📊 Database indexes will be created by individual models');
    } catch (error) {
      console.error('❌ Failed to setup database indexes:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const database = new Database();

module.exports = database;