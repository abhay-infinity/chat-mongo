const Redis = require('ioredis');

let redisClient = null;

const connectRedis = async () => {
    try {
        // Check if Redis is disabled (for development without Redis)
        if (process.env.REDIS_DISABLED === 'true') {
            console.log('⚠️  Redis is disabled (REDIS_DISABLED=true). Some features may not work.');
            return null;
        }

        if (process.env.REDIS_URL) {
            console.log('Redis connecting via URL...');
            redisClient = new Redis(process.env.REDIS_URL, {
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableOfflineQueue: false, // Don't queue commands when offline
                lazyConnect: false,
            });
        } else {
            console.log('Redis connecting via Host/Port...');
            redisClient = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                retryStrategy: (times) => {
                    // Stop retrying after 10 attempts (about 20 seconds)
                    if (times > 10) {
                        console.error('❌ Redis connection failed after 10 attempts. App will continue without Redis.');
                        console.log('💡 To disable Redis warnings, set REDIS_DISABLED=true in .env');
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableOfflineQueue: false,
                lazyConnect: false,
            });
        }

        redisClient.on('connect', () => {
            console.log('✅ Redis client connected');
        });

        redisClient.on('error', (err) => {
            // Only log error if not already disconnected
            if (err.code !== 'ECONNREFUSED' || process.env.NODE_ENV === 'development') {
                console.error('Redis error:', err.message || err);
            }
        });

        redisClient.on('reconnecting', () => {
            console.log('🔄 Redis client reconnecting...');
        });

        redisClient.on('close', () => {
            console.log('⚠️  Redis connection closed');
        });

        // Test connection with timeout
        const pingPromise = redisClient.ping();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
        );

        await Promise.race([pingPromise, timeoutPromise]);
        console.log('✅ Redis connection verified');

        return redisClient;
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message || error);
        console.log('⚠️  App will continue without Redis. Some features (online status, typing indicators) may not work.');
        console.log('💡 To disable Redis warnings, set REDIS_DISABLED=true in .env');
        console.log('💡 To fix: Install Redis or use a cloud Redis service (see REDIS_SETUP_WINDOWS.md)');
        
        // Don't throw error - let app continue without Redis
        redisClient = null;
        return null;
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        // Return null instead of throwing - allows graceful degradation
        return null;
    }
    return redisClient;
};

// Helper functions for common Redis operations
const redisHelpers = {
    // Set user online status
    setUserOnline: async (userId, socketId) => {
        const client = getRedisClient();
        if (!client) return; // Graceful degradation
        try {
            await client.hset(`online:${userId}`, 'socketId', socketId, 'status', 'online', 'lastSeen', Date.now());
            await client.sadd('online_users', userId);
        } catch (err) {
            console.warn('Redis setUserOnline failed:', err.message);
        }
    },

    // Set user offline
    setUserOffline: async (userId) => {
        const client = getRedisClient();
        if (!client) return; // Graceful degradation
        try {
            await client.hset(`online:${userId}`, 'status', 'offline', 'lastSeen', Date.now());
            await client.srem('online_users', userId);
        } catch (err) {
            console.warn('Redis setUserOffline failed:', err.message);
        }
    },

    // Get user status
    getUserStatus: async (userId) => {
        const client = getRedisClient();
        if (!client) return null; // Graceful degradation
        try {
            return await client.hgetall(`online:${userId}`);
        } catch (err) {
            console.warn('Redis getUserStatus failed:', err.message);
            return null;
        }
    },

    // Get all online users
    getOnlineUsers: async () => {
        const client = getRedisClient();
        if (!client) return []; // Graceful degradation
        try {
            return await client.smembers('online_users');
        } catch (err) {
            console.warn('Redis getOnlineUsers failed:', err.message);
            return [];
        }
    },

    // Cache user location
    setUserLocation: async (userId, latitude, longitude) => {
        const client = getRedisClient();
        if (!client) return; // Graceful degradation
        try {
            await client.geoadd('user_locations', longitude, latitude, userId);
        } catch (err) {
            console.warn('Redis setUserLocation failed:', err.message);
        }
    },

    // Get nearby users
    getNearbyUsers: async (longitude, latitude, radius = 5000) => {
        const client = getRedisClient();
        if (!client) return []; // Graceful degradation
        try {
            return await client.georadius('user_locations', longitude, latitude, radius, 'm', 'WITHDIST', 'ASC');
        } catch (err) {
            console.warn('Redis getNearbyUsers failed:', err.message);
            return [];
        }
    },

    // Cache data with expiry
    setCache: async (key, value, expirySeconds = 3600) => {
        const client = getRedisClient();
        if (!client) return; // Graceful degradation
        try {
            await client.setex(key, expirySeconds, JSON.stringify(value));
        } catch (err) {
            console.warn('Redis setCache failed:', err.message);
        }
    },

    // Get cached data
    getCache: async (key) => {
        const client = getRedisClient();
        if (!client) return null; // Graceful degradation
        try {
            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            console.warn('Redis getCache failed:', err.message);
            return null;
        }
    },

    // Delete cache
    deleteCache: async (key) => {
        const client = getRedisClient();
        if (!client) return; // Graceful degradation
        try {
            await client.del(key);
        } catch (err) {
            console.warn('Redis deleteCache failed:', err.message);
        }
    },

    // Store typing status
    setTyping: async (roomId, userId, isTyping) => {
        const client = getRedisClient();
        if (!client) return; // Graceful degradation
        try {
            const key = `typing:${roomId}`;
            if (isTyping) {
                await client.sadd(key, userId);
                await client.expire(key, 10); // Auto-expire after 10 seconds
            } else {
                await client.srem(key, userId);
            }
        } catch (err) {
            console.warn('Redis setTyping failed:', err.message);
        }
    },

    // Get typing users
    getTypingUsers: async (roomId) => {
        const client = getRedisClient();
        if (!client) return []; // Graceful degradation
        try {
            return await client.smembers(`typing:${roomId}`);
        } catch (err) {
            console.warn('Redis getTypingUsers failed:', err.message);
            return [];
        }
    }
};

module.exports = {
    connectRedis,
    getRedisClient,
    ...redisHelpers
};
