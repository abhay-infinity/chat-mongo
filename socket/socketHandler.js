const jwt = require('jsonwebtoken');
const Message = require('../model/Message.model');
const Chat = require('../model/Chat.model');
const User = require('../model/User.model');
const MessagePool = require('../model/MessagePool.model');
const { JWT_SECRET } = require('../config/constants');
const { getAppSetting } = require('../utils/settings');
const {
    setUserOnline,
    setUserOffline,
    setTyping,
    getTypingUsers,
    setUserLocation
} = require('../config/redis');

// Store active socket connections
const userSockets = new Map(); // userId -> socketId

module.exports = (io) => {
    // ==================== AUTHENTICATION MIDDLEWARE ====================
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    });

    // ==================== CONNECTION HANDLER ====================
    io.on('connection', async (socket) => {
        console.log(`✅ User connected: ${socket.userId} (${socket.user.username})`);

        // Store socket connection
        userSockets.set(socket.userId, socket.id);

        // Update user status
        setUserOnline(socket.userId, socket.id).catch(err => console.error('Redis online error:', err));
        User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: new Date() }).catch(err => console.error('DB online error:', err));

        // Notify contacts about online status
        socket.broadcast.emit('user:online', {
            userId: socket.userId,
            username: socket.user.username,
            timestamp: new Date()
        });

        // Auto-join user's chat rooms
        Chat.find({ participants: socket.userId, isActive: true })
            .then(chats => {
                chats.forEach(chat => {
                    socket.join(chat._id.toString());
                    console.log(`🚪 User ${socket.userId} auto-joined room: ${chat._id}`);
                });
            })
            .catch(err => console.error('Auto-join rooms error:', err));

        // ==================== CHAT OPERATIONS ====================

        // Get all chats
        socket.on('chats:getAll', async (data, callback) => {
            try {
                const { page = 1, limit = 20 } = data || {};

                const chats = await Chat.find({
                    participants: socket.userId,
                    isActive: true
                })
                    .populate('participants', '-password')
                    .populate('lastMessage')
                    .populate('groupAdmin', '-password')
                    .sort({ updatedAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(parseInt(limit));

                const total = await Chat.countDocuments({
                    participants: socket.userId,
                    isActive: true
                });

                callback({
                    success: true,
                    data: {
                        chats,
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total,
                            pages: Math.ceil(total / limit)
                        }
                    }
                });
            } catch (error) {
                console.error('Get all chats error:', error);
                callback({ success: false, message: 'Error fetching chats', error: error.message });
            }
        });

        // Get chat by ID
        socket.on('chat:getById', async (data, callback) => {
            try {
                const { chatId } = data;

                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                })
                    .populate('participants', '-password')
                    .populate('lastMessage')
                    .populate('groupAdmin', '-password');

                if (!chat) {
                    return callback({ success: false, message: 'Chat not found' });
                }

                callback({ success: true, data: { chat } });
            } catch (error) {
                console.error('Get chat by ID error:', error);
                callback({ success: false, message: 'Error fetching chat', error: error.message });
            }
        });

        // Create or get private chat
        socket.on('chat:createPrivate', async (data, callback) => {
            try {
                const { userId } = data;

                // Check if user exists
                const otherUser = await User.findById(userId);
                if (!otherUser) {
                    return callback({ success: false, message: 'User not found' });
                }

                // Check if chat already exists
                let chat = await Chat.findOne({
                    type: 'private',
                    participants: { $all: [socket.userId, userId] }
                })
                    .populate('participants', '-password')
                    .populate('lastMessage');

                // Create new chat if doesn't exist
                if (!chat) {
                    chat = new Chat({
                        type: 'private',
                        participants: [socket.userId, userId]
                    });
                    await chat.save();
                    await chat.populate('participants', '-password');

                    // Both users join the room
                    socket.join(chat._id.toString());
                    const otherSocketId = userSockets.get(userId);
                    if (otherSocketId) {
                        io.to(otherSocketId).socketsJoin(chat._id.toString());
                        io.to(otherSocketId).emit('chat:new', { chat });
                    }
                }

                callback({ success: true, data: { chat } });
            } catch (error) {
                console.error('Create private chat error:', error);
                callback({ success: false, message: 'Error creating chat', error: error.message });
            }
        });

        // Delete chat
        socket.on('chat:delete', async (data, callback) => {
            try {
                const { chatId } = data;

                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (!chat) {
                    return callback({ success: false, message: 'Chat not found' });
                }

                // For group chats, only admin can delete
                if (chat.type === 'group' && chat.groupAdmin.toString() !== socket.userId) {
                    return callback({ success: false, message: 'Only group admin can delete the group' });
                }

                chat.isActive = false;
                await chat.save();

                // Notify all participants
                io.to(chatId).emit('chat:deleted', { chatId });

                callback({ success: true, message: 'Chat deleted successfully' });
            } catch (error) {
                console.error('Delete chat error:', error);
                callback({ success: false, message: 'Error deleting chat', error: error.message });
            }
        });

        // Mute/Unmute chat
        socket.on('chat:toggleMute', async (data, callback) => {
            try {
                const { chatId, mute } = data;

                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (!chat) {
                    return callback({ success: false, message: 'Chat not found' });
                }

                if (mute) {
                    if (!chat.mutedBy.includes(socket.userId)) {
                        chat.mutedBy.push(socket.userId);
                    }
                } else {
                    chat.mutedBy = chat.mutedBy.filter(id => id.toString() !== socket.userId);
                }

                await chat.save();

                callback({
                    success: true,
                    message: mute ? 'Chat muted' : 'Chat unmuted',
                    data: { chat }
                });
            } catch (error) {
                console.error('Toggle mute chat error:', error);
                callback({ success: false, message: 'Error updating chat', error: error.message });
            }
        });

        // Clear unread count
        socket.on('chat:clearUnread', async (data, callback) => {
            try {
                const { chatId } = data;

                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (!chat) {
                    return callback({ success: false, message: 'Chat not found' });
                }

                chat.unreadCount.set(socket.userId, 0);
                await chat.save();

                callback({ success: true, message: 'Unread count cleared' });
            } catch (error) {
                console.error('Clear unread count error:', error);
                callback({ success: false, message: 'Error clearing unread count', error: error.message });
            }
        });

        // Join a specific chat room
        socket.on('chat:join', async (data, callback) => {
            try {
                const { chatId } = data;
                console.log(`📡 User ${socket.userId} joining chat: ${chatId}`);

                // Verify user is part of the chat
                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (chat) {
                    socket.join(chatId);
                    console.log(`✅ User ${socket.userId} joined room: ${chatId}`);

                    if (callback) {
                        callback({ success: true, chatId });
                    } else {
                        socket.emit('chat:joined', { chatId, success: true });
                    }
                } else {
                    console.log(`❌ User ${socket.userId} denied access to chat: ${chatId}`);
                    const errorMsg = { success: false, message: 'Chat not found or access denied' };
                    if (callback) {
                        callback(errorMsg);
                    } else {
                        socket.emit('error', errorMsg);
                    }
                }
            } catch (error) {
                console.error('Join chat error:', error);
                const errorMsg = { success: false, message: 'Error joining chat', error: error.message };
                if (callback) {
                    callback(errorMsg);
                } else {
                    socket.emit('error', errorMsg);
                }
            }
        });

        // Leave a chat room
        socket.on('chat:leave', (data, callback) => {
            const { chatId } = data;
            socket.leave(chatId);

            if (callback) {
                callback({ success: true, chatId });
            } else {
                socket.emit('chat:left', { chatId });
            }
        });

        // ==================== MESSAGE OPERATIONS ====================

        // Get messages for a chat
        socket.on('messages:get', async (data, callback) => {
            try {
                const { chatId, page = 1, limit = 50 } = data;

                // Verify user is part of the chat
                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (!chat) {
                    return callback({ success: false, message: 'Chat not found' });
                }

                const messages = await Message.find({ chat: chatId })
                    .populate('sender', '-password')
                    .populate('replyTo')
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(parseInt(limit));

                const total = await Message.countDocuments({ chat: chatId });

                callback({
                    success: true,
                    data: {
                        messages: messages.reverse(),
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total,
                            pages: Math.ceil(total / limit)
                        }
                    }
                });
            } catch (error) {
                console.error('Get messages error:', error);
                callback({ success: false, message: 'Error fetching messages', error: error.message });
            }
        });

        // Send message
        socket.on('message:send', async (data, callback) => {
            try {
                const { chatId, content, type = 'text', replyTo, media, location } = data;
                console.log(`📩 Message from ${socket.userId} in ${chatId}`);

                // Verify user is part of the chat
                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (!chat) {
                    const errorMsg = { success: false, message: 'Chat not found' };
                    return callback ? callback(errorMsg) : socket.emit('error', errorMsg);
                }

                // Create message
                const message = new Message({
                    chat: chatId,
                    sender: socket.userId,
                    content,
                    type,
                    replyTo: replyTo || undefined,
                    media: media || undefined,
                    location: location || undefined
                });

                await message.save();
                await message.populate('sender', '-password');
                if (replyTo) {
                    await message.populate('replyTo');
                }

                // Update chat's last message
                chat.lastMessage = message._id;

                // Increment unread count for other participants
                chat.participants.forEach(participantId => {
                    if (participantId.toString() !== socket.userId) {
                        const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
                        chat.unreadCount.set(participantId.toString(), currentCount + 1);
                    }
                });

                await chat.save();

                // Emit message to all participants in the chat room
                io.to(chatId).emit('message:new', {
                    message,
                    chatId
                });

                // Send success response
                if (callback) {
                    callback({ success: true, data: { message } });
                }

                // Check for offline users for notification
                const offlineParticipants = chat.participants.filter(
                    p => p.toString() !== socket.userId && !userSockets.has(p.toString())
                );

                if (offlineParticipants.length > 0) {
                    console.log(`📬 Send push notification to ${offlineParticipants.length} offline users`);
                    // TODO: Implement push notification logic here
                }

            } catch (error) {
                console.error('Send message error:', error);
                const errorMsg = { success: false, message: 'Error sending message', error: error.message };
                if (callback) {
                    callback(errorMsg);
                } else {
                    socket.emit('error', errorMsg);
                }
            }
        });

        // Delete message
        socket.on('message:delete', async (data, callback) => {
            try {
                const { messageId, chatId } = data;

                const message = await Message.findOne({
                    _id: messageId,
                    sender: socket.userId
                });

                if (!message) {
                    return callback({ success: false, message: 'Message not found or unauthorized' });
                }

                message.isDeleted = true;
                message.content = 'This message was deleted';
                await message.save();

                // Notify all participants
                io.to(chatId).emit('message:deleted', { messageId, chatId });

                callback({ success: true, message: 'Message deleted successfully' });
            } catch (error) {
                console.error('Delete message error:', error);
                callback({ success: false, message: 'Error deleting message', error: error.message });
            }
        });

        // Mark message as read
        socket.on('message:read', async (data, callback) => {
            try {
                const { messageId, chatId } = data;

                await Message.findByIdAndUpdate(messageId, {
                    $addToSet: { readBy: { user: socket.userId, readAt: new Date() } }
                });

                socket.to(chatId).emit('message:read', {
                    messageId,
                    userId: socket.userId,
                    readAt: new Date()
                });

                if (callback) {
                    callback({ success: true });
                }
            } catch (error) {
                console.error('Mark message as read error:', error);
                if (callback) {
                    callback({ success: false, message: 'Error marking message as read' });
                }
            }
        });

        // Mark message as delivered
        socket.on('message:delivered', async (data, callback) => {
            try {
                const { messageId, chatId } = data;

                await Message.findByIdAndUpdate(messageId, {
                    $addToSet: { deliveredTo: { user: socket.userId, deliveredAt: new Date() } }
                });

                socket.to(chatId).emit('message:delivered', {
                    messageId,
                    userId: socket.userId,
                    deliveredAt: new Date()
                });

                if (callback) {
                    callback({ success: true });
                }
            } catch (error) {
                console.error('Mark message as delivered error:', error);
                if (callback) {
                    callback({ success: false, message: 'Error marking message as delivered' });
                }
            }
        });

        // ==================== TYPING INDICATORS ====================

        socket.on('typing:start', async (data, callback) => {
            try {
                const { chatId } = data;
                await setTyping(chatId, socket.userId, true);

                socket.to(chatId).emit('typing:user', {
                    chatId,
                    userId: socket.userId,
                    username: socket.user.username,
                    isTyping: true
                });

                if (callback) {
                    callback({ success: true });
                }
            } catch (error) {
                console.error('Typing start error:', error);
            }
        });

        socket.on('typing:stop', async (data, callback) => {
            try {
                const { chatId } = data;
                await setTyping(chatId, socket.userId, false);

                socket.to(chatId).emit('typing:user', {
                    chatId,
                    userId: socket.userId,
                    username: socket.user.username,
                    isTyping: false
                });

                if (callback) {
                    callback({ success: true });
                }
            } catch (error) {
                console.error('Typing stop error:', error);
            }
        });

        // ==================== RANDOM CHAT / MESSAGE POOL ====================

        // Initiate random chat request
        socket.on('pool:initiateSend', async (data, callback) => {
            try {
                const { message, preferences, location } = data;
                const user = await User.findById(socket.userId);

                if (!user) {
                    return callback({ success: false, message: 'User not found' });
                }

                // Calculate cost
                let cost = await getAppSetting('coin.send_request', 10);
                if (preferences && (preferences.gender !== 'any' || preferences.ageRange !== 'any')) {
                    cost += await getAppSetting('coin.age_filter_extra', 5);
                }

                // Check coins
                if (user.coins < cost) {
                    return callback({
                        success: false,
                        message: 'Insufficient coins',
                        required: cost,
                        available: user.coins
                    });
                }

                // Deduct coins
                await user.deductCoins(cost, 'Initiated random chat request');

                // Auto-match logic
                const matchQuery = {
                    isActive: true,
                    expiresAt: { $gt: new Date() },
                    sender: { $ne: socket.userId }
                };

                if (preferences && preferences.gender && preferences.gender !== 'any') {
                    matchQuery['preferences.gender'] = { $in: [user.gender, 'any'] };
                }

                const potentialMatch = await MessagePool.findOne(matchQuery)
                    .populate('sender', 'username avatar gender age');

                if (potentialMatch) {
                    const theyAreAny = potentialMatch.preferences.gender === 'any';
                    const weMatchThem = theyAreAny || potentialMatch.preferences.gender === user.gender;

                    if (weMatchThem) {
                        // MATCH FOUND!
                        const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
                        const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

                        const chat = new Chat({
                            type: 'private',
                            participants: [potentialMatch.sender._id, socket.userId],
                            isRandomChat: true,
                            expiresAt: chatExpiresAt
                        });

                        await chat.save();
                        potentialMatch.isActive = false;
                        await potentialMatch.save();

                        await chat.populate('participants', 'username avatar gender age');

                        // Both users join the room
                        socket.join(chat._id.toString());
                        const otherSocketId = userSockets.get(potentialMatch.sender._id.toString());
                        if (otherSocketId) {
                            io.to(otherSocketId).socketsJoin(chat._id.toString());
                            io.to(otherSocketId).emit('chat:matched', { chat });
                        }

                        return callback({
                            success: true,
                            message: 'Auto-Matched with a sender immediately!',
                            data: { chat, balance: user.coins, isMatched: true }
                        });
                    }
                }

                // No match found, add to pool
                const poolExpiryMinutes = await getAppSetting('limit.pool_expiry_minutes', 60);
                const expiresAt = new Date(Date.now() + poolExpiryMinutes * 60 * 1000);

                const poolEntry = new MessagePool({
                    sender: socket.userId,
                    message: message || 'Hey! Want to chat?',
                    preferences: preferences || { gender: 'any', ageRange: 'any' },
                    location: location || { type: 'Point', coordinates: [0, 0] },
                    expiresAt
                });

                await poolEntry.save();

                callback({
                    success: true,
                    message: 'Request added to global pool',
                    data: { poolEntry, balance: user.coins, isMatched: false }
                });
            } catch (error) {
                console.error('Initiate send error:', error);
                callback({ success: false, message: 'Error initiating send', error: error.message });
            }
        });

        // Get active pool
        socket.on('pool:getActive', async (data, callback) => {
            try {
                const poolEntries = await MessagePool.find({
                    isActive: true,
                    expiresAt: { $gt: new Date() },
                    sender: { $ne: socket.userId }
                }).populate('sender', 'username avatar gender age');

                callback({
                    success: true,
                    data: { poolEntries }
                });
            } catch (error) {
                console.error('Get active pool error:', error);
                callback({ success: false, message: 'Error fetching pool', error: error.message });
            }
        });

        // Accept random chat request
        socket.on('pool:acceptSend', async (data, callback) => {
            try {
                const { poolId } = data;

                const poolEntry = await MessagePool.findById(poolId);
                if (!poolEntry || !poolEntry.isActive || poolEntry.expiresAt < new Date()) {
                    return callback({ success: false, message: 'Request no longer available' });
                }

                const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
                const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

                const chat = new Chat({
                    type: 'private',
                    participants: [poolEntry.sender, socket.userId],
                    isRandomChat: true,
                    expiresAt: chatExpiresAt
                });

                await chat.save();
                poolEntry.isActive = false;
                await poolEntry.save();

                await chat.populate('participants', 'username avatar gender age');

                // Both users join the room
                socket.join(chat._id.toString());
                const otherSocketId = userSockets.get(poolEntry.sender.toString());
                if (otherSocketId) {
                    io.to(otherSocketId).socketsJoin(chat._id.toString());
                    io.to(otherSocketId).emit('chat:matched', { chat });
                }

                callback({
                    success: true,
                    message: 'Chat started successfully',
                    data: { chat }
                });
            } catch (error) {
                console.error('Accept send error:', error);
                callback({ success: false, message: 'Error starting chat', error: error.message });
            }
        });

        // Extend chat duration
        socket.on('chat:extend', async (data, callback) => {
            try {
                const { chatId, hours } = data;

                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId,
                    isRandomChat: true
                });

                if (!chat) {
                    return callback({ success: false, message: 'Timed chat not found' });
                }

                const user = await User.findById(socket.userId);

                let cost = 0;
                if (hours === 24) {
                    cost = await getAppSetting('coin.extend_chat_24h', 50);
                } else if (hours === 48) {
                    cost = await getAppSetting('coin.extend_chat_48h', 90);
                } else {
                    return callback({ success: false, message: 'Invalid extension duration' });
                }

                if (user.coins < cost) {
                    return callback({
                        success: false,
                        message: 'Insufficient coins',
                        required: cost,
                        available: user.coins
                    });
                }

                await user.deductCoins(cost, `Extended chat by ${hours} hours`);

                const currentExpiry = chat.expiresAt > new Date() ? chat.expiresAt : new Date();
                chat.expiresAt = new Date(currentExpiry.getTime() + hours * 60 * 60 * 1000);
                chat.extensionCount += 1;
                await chat.save();

                // Notify other participant
                io.to(chatId).emit('chat:extended', {
                    chatId,
                    expiresAt: chat.expiresAt,
                    hours
                });

                callback({
                    success: true,
                    message: `Chat extended by ${hours} hours`,
                    data: { expiresAt: chat.expiresAt, balance: user.coins }
                });
            } catch (error) {
                console.error('Extend chat error:', error);
                callback({ success: false, message: 'Error extending chat', error: error.message });
            }
        });

        // ==================== USER OPERATIONS ====================

        // Update location
        socket.on('location:update', async (data, callback) => {
            try {
                const { latitude, longitude, address } = data;

                await User.findByIdAndUpdate(socket.userId, {
                    location: { type: 'Point', coordinates: [longitude, latitude], address: address || '' }
                });

                await setUserLocation(socket.userId, latitude, longitude);

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
        });

        // Search users
        socket.on('users:search', async (data, callback) => {
            try {
                const { query } = data;

                if (!query || query.trim().length < 2) {
                    return callback({ success: false, message: 'Search query must be at least 2 characters' });
                }

                const users = await User.find({
                    _id: { $ne: socket.userId },
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                })
                    .select('-password')
                    .limit(20);

                callback({
                    success: true,
                    data: { users, count: users.length }
                });
            } catch (error) {
                console.error('Search users error:', error);
                callback({ success: false, message: 'Error searching users', error: error.message });
            }
        });

        // Get nearby users
        socket.on('users:nearby', async (data, callback) => {
            try {
                const { latitude, longitude, radius = 5000 } = data;

                if (!latitude || !longitude) {
                    return callback({ success: false, message: 'Latitude and longitude are required' });
                }

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
                    .limit(50);

                callback({
                    success: true,
                    data: { users, count: users.length }
                });
            } catch (error) {
                console.error('Get nearby users error:', error);
                callback({ success: false, message: 'Error fetching nearby users', error: error.message });
            }
        });

        // ==================== DISCONNECT HANDLER ====================

        socket.on('disconnect', async () => {
            console.log(`❌ User disconnected: ${socket.userId} (${socket.user.username})`);

            userSockets.delete(socket.userId);

            setUserOffline(socket.userId).catch(err => console.error('Redis offline error:', err));
            User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() })
                .catch(err => console.error('DB offline error:', err));

            socket.broadcast.emit('user:offline', {
                userId: socket.userId,
                username: socket.user.username,
                lastSeen: new Date()
            });
        });

        // ==================== ERROR HANDLER ====================

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    return io;
};
