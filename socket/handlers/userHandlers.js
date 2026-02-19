const User = require('../../model/User.model');
const { setUserLocation, getCache, setCache } = require('../../config/redis');

/**
 * User Operation Handlers
 * User search, nearby users, location updates with Redis caching
 */

// Update location
const handleUpdateLocation = async (socket, data, callback) => {
    try {
        const { latitude, longitude, address } = data;

        await User.findByIdAndUpdate(socket.userId, {
            location: { type: 'Point', coordinates: [longitude, latitude], address: address || '' }
        });

        // Update Redis geospatial index for nearby search
        await setUserLocation(socket.userId, latitude, longitude);

        // Invalidate user cache
        await setCache(`user:${socket.userId}`, null, 0);

        if (callback) {
            callback({ success: true, message: 'Location updated successfully' });
        } else {
            socket.emit('location:updated', { success: true });
        }
    } catch (error) {
        console.error('Update location error:', error);
        const errorMsg = { success: false, message: 'Error updating location', error: error.message };
        if (callback) {
            callback(errorMsg);
        } else {
            socket.emit('error', errorMsg);
        }
    }
};

// Search users with caching
const handleSearchUsers = async (socket, data, callback) => {
    try {
        const { query } = data;

        if (!query || query.trim().length < 2) {
            return callback({ success: false, message: 'Search query must be at least 2 characters' });
        }

        const cacheKey = `search:users:${query.toLowerCase()}`;

        // Check cache
        let cachedUsers = await getCache(cacheKey);

        if (cachedUsers) {
            console.log(`✅ Cache hit for users:search - Query: ${query}`);
            return callback({
                success: true,
                data: { users: cachedUsers, count: cachedUsers.length },
                cached: true
            });
        }

        // Search database
        const users = await User.find({
            _id: { $ne: socket.userId },
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        })
            .select('-password')
            .limit(20)
            .lean();

        // Cache for 5 minutes
        await setCache(cacheKey, users, 5 * 60);

        callback({
            success: true,
            data: { users, count: users.length }
        });
    } catch (error) {
        console.error('Search users error:', error);
        callback({ success: false, message: 'Error searching users', error: error.message });
    }
};

// Get nearby users with caching
const handleGetNearbyUsers = async (socket, data, callback) => {
    try {
        const { latitude, longitude, radius = 5000 } = data;

        if (!latitude || !longitude) {
            return callback({ success: false, message: 'Latitude and longitude are required' });
        }

        const cacheKey = `nearby:${latitude}:${longitude}:${radius}`;

        // Check cache
        let cachedUsers = await getCache(cacheKey);

        if (cachedUsers) {
            console.log(`✅ Cache hit for users:nearby`);
            return callback({
                success: true,
                data: { users: cachedUsers, count: cachedUsers.length },
                cached: true
            });
        }

        // Query database with geospatial search
        const users = await User.find({
            _id: { $ne: socket.userId },
            'settings.allowNearbyUsers': true,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(radius)
                }
            }
        })
            .select('-password')
            .limit(50)
            .lean();

        // Cache for 1 minute (location changes frequently)
        await setCache(cacheKey, users, 60);

        callback({
            success: true,
            data: { users, count: users.length }
        });
    } catch (error) {
        console.error('Get nearby users error:', error);
        callback({ success: false, message: 'Error fetching nearby users', error: error.message });
    }
};

// Block user
const handleBlockUser = async (socket, data, callback) => {
    try {
        const { userId } = data;

        if (!userId) {
            return callback({ success: false, message: 'User ID is required' });
        }

        if (userId === socket.userId.toString()) {
            return callback({ success: false, message: 'Cannot block yourself' });
        }

        const user = await User.findByIdAndUpdate(
            socket.userId,
            { $addToSet: { blockedUsers: userId } },
            { new: true }
        ).select('-password');

        // Invalidate user cache
        await setCache(`user:${socket.userId}`, null, 0);

        callback({
            success: true,
            message: 'User blocked successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Block user error:', error);
        callback({ success: false, message: 'Error blocking user', error: error.message });
    }
};

// Send wave
const handleSendWave = async (socket, io, data, callback) => {
    try {
        const { userId } = data;

        if (!userId) {
            return callback({ success: false, message: 'User ID is required' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return callback({ success: false, message: 'User not found' });
        }

        // Add wave to target user
        targetUser.wavesReceived.push({
            from: socket.userId,
            createdAt: new Date()
        });
        await targetUser.save();

        // Emit socket event to notify target user
        const targetSocketId = global.userSockets?.get(userId);
        if (targetSocketId) {
            const sender = await User.findById(socket.userId).select('username avatar');
            io.to(targetSocketId).emit('wave:received', {
                from: sender,
                timestamp: new Date()
            });
        }

        callback({ success: true, message: 'Wave sent successfully' });
    } catch (error) {
        console.error('Send wave error:', error);
        callback({ success: false, message: 'Error sending wave', error: error.message });
    }
};

module.exports = {
    handleUpdateLocation,
    handleSearchUsers,
    handleGetNearbyUsers,
    handleBlockUser,
    handleSendWave
};
