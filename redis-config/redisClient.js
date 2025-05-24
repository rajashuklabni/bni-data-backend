const Redis = require('ioredis');

// Redis client configuration
const redisClient = new Redis({
  host: 'redis-17622.c241.us-east-1-4.ec2.redns.redis-cloud.com',
  port: 17622,
  username: 'default',
  password: 'S3V0nnJOaYmWnVXlkhwFRHwvKwU5pjqu',
  // Basic performance settings
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('Successfully connected to Redis Cloud');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Cache helper functions
const cacheHelper = {
  // Set cache with expiry
  setCache: async (key, data, expiryInSeconds = 3600) => {
    try {
      const stringData = JSON.stringify(data);
      await redisClient.setex(key, expiryInSeconds, stringData);
      return true;
    } catch (error) {
      console.error('Redis setCache error:', error);
      return false;
    }
  },

  // Get cache
  getCache: async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getCache error:', error);
      return null;
    }
  },

  // Delete cache
  deleteCache: async (key) => {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis deleteCache error:', error);
      return false;
    }
  },

  // Clear all cache
  clearAllCache: async () => {
    try {
      await redisClient.flushdb();
      return true;
    } catch (error) {
      console.error('Redis clearAllCache error:', error);
      return false;
    }
  }
};

module.exports = {
  redisClient,
  cacheHelper
}; 