const jwt = require('jsonwebtoken');
const User = require('../../model/User.model');
const { JWT_SECRET } = require('../../config/constants');
const { getCache, setCache } = require('../../config/redis');

/**
 * Socket.IO Authentication Middleware
 * Validates JWT token and attaches user to socket
 */
const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return next(new Error('Token expired'));
            }
            return next(new Error('Invalid token'));
        }

        // Check Redis cache first for fast authentication
        const cacheKey = `user:${decoded.userId}`;
        let user = await getCache(cacheKey);

        if (!user) {
            // Cache miss - fetch from database
            user = await User.findById(decoded.userId).select('-password').lean();

            if (!user) {
                return next(new Error('User not found'));
            }

            // Cache user data for 24 hours
            await setCache(cacheKey, user, 24 * 60 * 60);
        }

        // Attach user data to socket
        socket.userId = user._id.toString();
        socket.user = user;

        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
    }
};

module.exports = socketAuthMiddleware;
