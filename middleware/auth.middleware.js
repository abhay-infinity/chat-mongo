const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { getCache, setCache } = require('../config/redis');
const User = require('../model/User.model');

/**
 * Fast Authentication Middleware - Redis First Approach
 * This middleware validates tokens using Redis cache for WhatsApp-like speed
 * Falls back to database only if cache miss
 */
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authentication token, access denied'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // REDIS FIRST: Check cache for user data (WhatsApp-like speed)
        const cacheKey = `user:${decoded.userId}`;
        let user = await getCache(cacheKey);

        if (user) {
            // Cache hit! Super fast response (normalize _id to string for consistent comparison with DB ObjectIds)
            req.user = user;
            req.userId = user._id != null ? String(user._id) : user._id;
            req.isGuest = user.isGuest || false;
            return next();
        }

        // Cache miss: Fetch from database
        user = await User.findById(decoded.userId).select('-password').lean();

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found, token invalid'
            });
        }

        // Cache user data for next request (24 hours)
        await setCache(cacheKey, user, 24 * 60 * 60);

        // Attach user to request (normalize _id to string for consistent comparison with DB ObjectIds)
        req.user = user;
        req.userId = user._id != null ? String(user._id) : user._id;
        req.isGuest = user.isGuest || false;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Optional Auth - Allows both authenticated and guest users
 */
const optionalAuth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        // No token, continue as guest
        req.isGuest = true;
        return next();
    }

    // Has token, validate it
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check cache first
        const cacheKey = `user:${decoded.userId}`;
        let user = await getCache(cacheKey);

        if (!user) {
            user = await User.findById(decoded.userId).select('-password').lean();
            if (user) {
                await setCache(cacheKey, user, 24 * 60 * 60);
            }
        }

        if (user) {
            req.user = user;
            req.userId = user._id != null ? String(user._id) : user._id;
            req.isGuest = user.isGuest || false;
        }
    } catch (error) {
        // Invalid token, continue as guest
        req.isGuest = true;
    }

    next();
};

/**
 * Require Coins - Check if user has enough coins
 */
const requireCoins = (amount) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.coins < amount) {
            return res.status(402).json({
                success: false,
                message: `Insufficient coins. Required: ${amount}, Available: ${req.user.coins}`,
                required: amount,
                available: req.user.coins
            });
        }

        next();
    };
};

/**
 * Require Full Account - Block guest users
 */
const requireFullAccount = (req, res, next) => {
    if (req.isGuest) {
        return res.status(403).json({
            success: false,
            message: 'This feature requires a full account. Please register to continue.',
            upgradeRequired: true
        });
    }
    next();
};

module.exports = {
    auth,
    optionalAuth,
    requireCoins,
    requireFullAccount
};
