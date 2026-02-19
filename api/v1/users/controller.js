const User = require('../../../model/User.model');
const { setUserLocation, getNearbyUsers } = require('../../../config/redis');
const { DEFAULT_SEARCH_RADIUS } = require('../../../config/constants');

// Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile',
            error: error.message
        });
    }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
    try {
        const { username, bio, avatar, gender, age, address } = req.body;
        const updates = {};

        if (username) updates.username = username;
        if (bio !== undefined) updates.bio = bio;
        if (avatar) updates.avatar = avatar;
        if (gender) updates.gender = gender;
        if (age !== undefined) updates.age = age;
        if (address !== undefined) {
            // Update address in location object
            const user = await User.findById(req.userId);
            if (user && user.location) {
                updates['location.address'] = address;
            } else {
                updates['location.address'] = address;
            }
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        // Invalidate cache
        await deleteCache(`user:${req.userId}`);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

// Update Location
exports.updateLocation = async (req, res) => {
    try {
        const { latitude, longitude, address } = req.body;

        const user = await User.findByIdAndUpdate(
            req.userId,
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                    address: address || ''
                }
            },
            { new: true }
        ).select('-password');

        // Cache location in Redis for faster nearby searches
        await setUserLocation(req.userId.toString(), latitude, longitude);

        res.json({
            success: true,
            message: 'Location updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating location',
            error: error.message
        });
    }
};

// Get Nearby Users
exports.getNearbyUsers = async (req, res) => {
    try {
        const { latitude, longitude, radius = DEFAULT_SEARCH_RADIUS } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        // Get nearby users from MongoDB
        const users = await User.find({
            _id: { $ne: req.userId },
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
            .limit(50);

        res.json({
            success: true,
            data: {
                users,
                count: users.length
            }
        });
    } catch (error) {
        console.error('Get nearby users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching nearby users',
            error: error.message
        });
    }
};

// Search Users
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const users = await User.find({
            _id: { $ne: req.userId },
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        })
            .select('-password')
            .limit(20);

        res.json({
            success: true,
            data: {
                users,
                count: users.length
            }
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching users',
            error: error.message
        });
    }
};

// Update Settings
exports.updateSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        const user = await User.findByIdAndUpdate(
            req.userId,
            { settings },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings',
            error: error.message
        });
    }
};

// Block User
exports.blockUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $addToSet: { blockedUsers: userId } },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'User blocked successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error blocking user',
            error: error.message
        });
    }
};

// Unblock User
exports.unblockUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $pull: { blockedUsers: userId } },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'User unblocked successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error unblocking user',
            error: error.message
        });
    }
};

// Upload Avatar
exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(
            req.userId,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: {
                user,
                avatarUrl
            }
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading avatar',
            error: error.message
        });
    }
};

// Get App Configuration (Init API for logged-in users)
exports.getAppConfig = async (req, res) => {
    try {
        const Settings = require('../../../model/Settings.model');
        const Chat = require('../../../model/Chat.model');

        // Get authenticated user with full details
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get all app settings
        const settingsData = await Settings.find({});
        const settings = {};
        settingsData.forEach(setting => {
            settings[setting.key] = setting.value;
        });

        // Get unread message count
        const chats = await Chat.find({
            participants: req.userId,
            isActive: true
        });

        let totalUnreadCount = 0;
        chats.forEach(chat => {
            const unreadCount = chat.unreadCount.get(req.userId.toString()) || 0;
            totalUnreadCount += unreadCount;
        });

        // Get total active chats count
        const totalChatsCount = chats.length;

        // Get user's coin balance
        const coinBalance = user.coins || 0;

        // Get recent coin transactions (last 5)
        const recentTransactions = user.coinTransactions
            ? user.coinTransactions.slice(-5).reverse()
            : [];

        // Response with all app initialization data
        res.json({
            success: true,
            message: 'App configuration loaded successfully',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    gender: user.gender,
                    age: user.age,
                    avatar: user.avatar,
                    bio: user.bio,
                    location: user.location,
                    isOnline: user.isOnline,
                    lastSeen: user.lastSeen,
                    isEmailVerified: user.isEmailVerified,
                    isPhoneVerified: user.isPhoneVerified,
                    isGuest: user.isGuest,
                    coins: coinBalance,
                    referralCode: user.referralCode,
                    settings: user.settings,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                appSettings: settings,
                stats: {
                    totalChats: totalChatsCount,
                    unreadMessages: totalUnreadCount,
                    coinBalance: coinBalance
                },
                recentTransactions: recentTransactions,
                features: {
                    guestLogin: settings['feature.guest_login'] !== false,
                    randomChat: settings['feature.random_chat'] !== false
                },
                coinPrices: {
                    sendRequest: settings['coin.send_request'] || 10,
                    ageFilter: settings['coin.age_filter_extra'] || 5,
                    extendChat24h: settings['coin.extend_chat_24h'] || 50,
                    extendChat48h: settings['coin.extend_chat_48h'] || 90,
                    textMessage: settings['coin.text_message'] || 0,
                    imageMessage: settings['coin.image_message'] || 2
                },
                rewards: {
                    guestSignup: settings['reward.guest_signup'] || 50,
                    fullSignup: settings['reward.full_signup'] || 150,
                    adWatch: settings['reward.ad_watch'] || 10,
                    dailyBonus: settings['reward.daily_bonus'] || 5
                },
                limits: {
                    chatExpiryHours: settings['limit.chat_expiry_hours'] || 24,
                    poolExpiryMinutes: settings['limit.pool_expiry_minutes'] || 60
                }
            }
        });

    } catch (error) {
        console.error('Get app config error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading app configuration',
            error: error.message
        });
    }
};

// Send Wave
exports.sendWave = async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUser = await User.findById(userId);
        
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Add wave to target user
        targetUser.wavesReceived.push({
            from: req.userId,
            createdAt: new Date()
        });
        await targetUser.save();

        // Emit socket event to notify target user
        const io = req.app.get('io');
        if (io) {
            const targetSocketId = global.userSockets?.get(userId);
            if (targetSocketId) {
                const sender = await User.findById(req.userId).select('username avatar');
                io.to(targetSocketId).emit('wave:received', {
                    from: sender,
                    timestamp: new Date()
                });
            }
        }

        res.json({
            success: true,
            message: 'Wave sent successfully'
        });
    } catch (error) {
        console.error('Send wave error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending wave',
            error: error.message
        });
    }
};

// Update FCM Token
exports.updateFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        
        await User.findByIdAndUpdate(req.userId, { fcmToken: token });
        
        res.json({
            success: true,
            message: 'FCM token updated'
        });
    } catch (error) {
        console.error('Update FCM token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating FCM token',
            error: error.message
        });
    }
};

