const User = require('../../model/User.model');
const Chat = require('../../model/Chat.model');
const MessagePool = require('../../model/MessagePool.model');
const { getAppSetting } = require('../../utils/settings');
const { getCache, setCache } = require('../../config/redis');

/**
 * Random Chat / Message Pool Handlers
 * Auto-matching and pool management with Redis caching
 */

// Initiate random chat request
const handleInitiateSend = async (socket, io, data, callback) => {
    try {
        const { message, preferences, location } = data;

        // Get user from cache
        const userCacheKey = `user:${socket.userId}`;
        let user = await getCache(userCacheKey);

        if (!user) {
            user = await User.findById(socket.userId);
            if (!user) {
                return callback({ success: false, message: 'User not found' });
            }
        } else {
            // Need full document for coin operations
            user = await User.findById(socket.userId);
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
            .populate('sender', 'username avatar gender age')
            .lean();

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
                await MessagePool.findByIdAndUpdate(potentialMatch._id, { isActive: false });

                await chat.populate('participants', 'username avatar gender age');

                // Both users join the room
                socket.join(chat._id.toString());
                const otherSocketId = global.userSockets?.get(potentialMatch.sender._id.toString());
                if (otherSocketId) {
                    io.to(otherSocketId).socketsJoin(chat._id.toString());
                    io.to(otherSocketId).emit('chat:matched', { chat: chat.toObject() });
                }

                // Cache the new chat
                await setCache(`chat:${chat._id}`, chat.toObject(), 10 * 60);

                return callback({
                    success: true,
                    message: 'Auto-Matched with a sender immediately!',
                    data: { chat: chat.toObject(), balance: user.coins, isMatched: true }
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
            data: { poolEntry: poolEntry.toObject(), balance: user.coins, isMatched: false }
        });
    } catch (error) {
        console.error('Initiate send error:', error);
        callback({ success: false, message: 'Error initiating send', error: error.message });
    }
};

// Get active pool with caching
const handleGetActivePool = async (socket, data, callback) => {
    try {
        const cacheKey = `pool:active:user:${socket.userId}`;

        // Check cache
        let cachedPool = await getCache(cacheKey);

        if (cachedPool) {
            console.log(`✅ Cache hit for pool:getActive`);
            return callback({
                success: true,
                data: { poolEntries: cachedPool },
                cached: true
            });
        }

        // Fetch from database
        const poolEntries = await MessagePool.find({
            isActive: true,
            expiresAt: { $gt: new Date() },
            sender: { $ne: socket.userId }
        })
            .populate('sender', 'username avatar gender age')
            .lean();

        // Cache for 30 seconds (pool changes frequently)
        await setCache(cacheKey, poolEntries, 30);

        callback({
            success: true,
            data: { poolEntries }
        });
    } catch (error) {
        console.error('Get active pool error:', error);
        callback({ success: false, message: 'Error fetching pool', error: error.message });
    }
};

// Accept random chat request
const handleAcceptSend = async (socket, io, data, callback) => {
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
        const otherSocketId = global.userSockets?.get(poolEntry.sender.toString());
        if (otherSocketId) {
            io.to(otherSocketId).socketsJoin(chat._id.toString());
            io.to(otherSocketId).emit('chat:matched', { chat: chat.toObject() });
        }

        // Cache the new chat
        await setCache(`chat:${chat._id}`, chat.toObject(), 10 * 60);

        callback({
            success: true,
            message: 'Chat started successfully',
            data: { chat: chat.toObject() }
        });
    } catch (error) {
        console.error('Accept send error:', error);
        callback({ success: false, message: 'Error starting chat', error: error.message });
    }
};

// Extend chat duration
const handleExtendChat = async (socket, io, data, callback) => {
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

        // Invalidate cache
        await setCache(`chat:${chatId}`, null, 0);

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
};

module.exports = {
    handleInitiateSend,
    handleGetActivePool,
    handleAcceptSend,
    handleExtendChat
};
