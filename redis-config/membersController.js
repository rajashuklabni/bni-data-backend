const { cacheHelper } = require('./redisClient');
const { Client } = require("pg");
const con = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false, // Required for secure connections to Render
    },
  });
  
  con
    .connect()
    .then(() => console.log("Connected to new BNI server PostgreSQL"))
    .catch((err) => console.error("Connection error", err.stack));

// Cache keys
const CACHE_KEYS = {
    ALL_MEMBERS: 'all_active_members',
    MEMBER_BY_EMAIL: (email) => `member_email_${email}`,
    MEMBER_BY_ID: (id) => `member_id_${id}`
};

// Cache expiry times (in seconds)
const CACHE_EXPIRY = {
    MEMBERS: 3600, // 1 hour
    MEMBER_DETAILS: 1800 // 30 minutes
};

// Fetch all active members with optimized Redis caching
const getMembers = async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.ALL_MEMBERS;
        
        // Try to get data from Redis cache first
        const cachedData = await cacheHelper.getCache(cacheKey);
        
        if (cachedData) {
            console.log('Serving members from Redis cache');
            return res.json(cachedData);
        }

        // If not in cache, get from database with optimized query
        const result = await con.query(`
            SELECT 
                *
            FROM member 
            WHERE delete_status = 0
            ORDER BY member_id DESC
        `);

        // Store in Redis cache with optimized expiry
        await cacheHelper.setCache(cacheKey, result.rows, CACHE_EXPIRY.MEMBERS);
        
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).send("Error fetching members");
    }
};

// Helper function to invalidate member caches
const invalidateMemberCaches = async (memberId, email) => {
    try {
        const keysToDelete = [
            CACHE_KEYS.ALL_MEMBERS,
            CACHE_KEYS.MEMBER_BY_EMAIL(email),
            CACHE_KEYS.MEMBER_BY_ID(memberId)
        ];
        
        // Use pipeline for batch deletion
        const pipeline = redisClient.pipeline();
        keysToDelete.forEach(key => pipeline.del(key));
        await pipeline.exec();
        
        console.log('Successfully invalidated member caches');
    } catch (error) {
        console.error('Error invalidating member caches:', error);
    }
};

module.exports = {
    getMembers,
    invalidateMemberCaches
}; 