const User = require('../../model/User.model');
const Chat = require('../../model/Chat.model');
const MessagePool = require('../../model/MessagePool.model');
const ConnectionRequest = require('../../model/ConnectionRequest.model');
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
        await poolEntry.populate('sender', 'username avatar gender age');
        const poolEntryObj = poolEntry.toObject();
        io.emit('pool:new', { poolEntry: poolEntryObj });

        callback({
            success: true,
            message: 'Request added to global pool',
            data: { poolEntry: poolEntryObj, balance: user.coins, isMatched: false }
        });
    } catch (error) {
        console.error('Initiate send error:', error);
        callback({ success: false, message: 'Error initiating send', error: error.message });
    }
};

// Get active pool; optional location for nearest-to-farthest sort
const handleGetActivePool = async (socket, data, callback) => {
    try {
        const { latitude, longitude, radius = 50000 } = data || {};
        const hasLocation = latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
        const maxDistance = Math.min(Number(radius) || 50000, 100000);

        let poolEntries;

        if (hasLocation) {
            const lng = parseFloat(longitude);
            const lat = parseFloat(latitude);
            poolEntries = await MessagePool.find({
                isActive: true,
                expiresAt: { $gt: new Date() },
                sender: { $ne: socket.userId },
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        },
                        $maxDistance: maxDistance
                    }
                }
            })
                .populate('sender', 'username avatar gender age')
                .lean();

            const R = 6371000;
            poolEntries = poolEntries.map((entry) => {
                const result = { ...entry };
                if (entry.location && entry.location.coordinates) {
                    const [entryLng, entryLat] = entry.location.coordinates;
                    const dLat = (entryLat - lat) * Math.PI / 180;
                    const dLon = (entryLng - lng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) ** 2 +
                        Math.cos(lat * Math.PI / 180) * Math.cos(entryLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    result.distance = Math.round(R * c);
                }
                return result;
            });
        } else {
            const cacheKey = `pool:active:user:${socket.userId}`;
            let cachedPool = await getCache(cacheKey);
            if (cachedPool) {
                return callback({
                    success: true,
                    data: { poolEntries: cachedPool },
                    cached: true
                });
            }
            poolEntries = await MessagePool.find({
                isActive: true,
                expiresAt: { $gt: new Date() },
                sender: { $ne: socket.userId }
            })
                .populate('sender', 'username avatar gender age')
                .lean();
            await setCache(cacheKey, poolEntries, 30);
        }

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
        io.emit('pool:removed', { poolId: poolEntry._id.toString() });

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

// Send Connection Request (via Socket.IO)
const handleSendConnectionRequest = async (socket, io, data, callback) => {
    try {
        console.log('📤 [SOCKET] request:send | User:', socket.userId);
        const { poolId, message } = data;
        console.log('📤 [SOCKET] Data:', { poolId, message: message || '(empty)' });

        const poolEntry = await MessagePool.findById(poolId);
        if (!poolEntry || !poolEntry.isActive || poolEntry.expiresAt < new Date()) {
            console.log('❌ [SOCKET] Pool entry not found or expired');
            return callback({ success: false, message: 'Broadcast no longer available' });
        }

        if (poolEntry.sender.toString() === socket.userId) {
            console.log('❌ [SOCKET] Cannot send request to own broadcast');
            return callback({ success: false, message: 'Cannot send request to your own broadcast' });
        }

        const existingRequest = await ConnectionRequest.findOne({
            poolId,
            requester: socket.userId,
            status: 'pending'
        });

        if (existingRequest) {
            console.log('❌ [SOCKET] Request already exists');
            return callback({ success: false, message: 'Request already sent' });
        }

        const request = new ConnectionRequest({
            poolId,
            broadcaster: poolEntry.sender,
            requester: socket.userId,
            message: message || '',
            expiresAt: poolEntry.expiresAt
        });

        await request.save();
        await request.populate('requester', 'username avatar gender age');
        
        console.log('✅ [SOCKET] Connection request created:', request._id);

        // Notify broadcaster
        const broadcasterSocketId = global.userSockets?.get(poolEntry.sender.toString());
        console.log('📡 [SOCKET] Emitting request:new to broadcaster:', broadcasterSocketId);
        if (broadcasterSocketId) {
            io.to(broadcasterSocketId).emit('request:new', {
                request: request.toObject()
            });
            console.log('✅ [SOCKET] request:new emitted');
        } else {
            console.log('⚠️ [SOCKET] Broadcaster not connected');
        }

        callback({
            success: true,
            message: 'Connection request sent',
            data: { request: request.toObject() }
        });
    } catch (error) {
        console.error('❌ [SOCKET] Send connection request error:', error);
        callback({ success: false, message: 'Error sending request', error: error.message });
    }
};

// Get Connection Requests (via Socket.IO)
const handleGetConnectionRequests = async (socket, data, callback) => {
    try {
        console.log('📤 [SOCKET] requests:get | User:', socket.userId);
        const { poolId } = data;
        console.log('📤 [SOCKET] Data:', { poolId });

        const poolEntry = await MessagePool.findById(poolId);
        if (!poolEntry || poolEntry.sender.toString() !== socket.userId) {
            console.log('❌ [SOCKET] Unauthorized');
            return callback({ success: false, message: 'Unauthorized' });
        }

        const requests = await ConnectionRequest.find({
            poolId,
            status: 'pending'
        })
            .populate('requester', 'username avatar gender age')
            .sort({ createdAt: -1 })
            .lean();

        console.log('✅ [SOCKET] Found', requests.length, 'requests');

        callback({
            success: true,
            data: { requests }
        });
    } catch (error) {
        console.error('❌ [SOCKET] Get connection requests error:', error);
        callback({ success: false, message: 'Error fetching requests', error: error.message });
    }
};

// Accept Connection Request (via Socket.IO)
const handleAcceptRequest = async (socket, io, data, callback) => {
    try {
        console.log('📤 [SOCKET] request:accept | User:', socket.userId);
        const { requestId } = data;
        console.log('📤 [SOCKET] Data:', { requestId });

        const request = await ConnectionRequest.findById(requestId).populate('poolId');
        if (!request || request.status !== 'pending') {
            console.log('❌ [SOCKET] Request not found or already processed');
            return callback({ success: false, message: 'Request not found or already processed' });
        }

        const poolEntry = request.poolId;
        if (poolEntry.sender.toString() !== socket.userId) {
            console.log('❌ [SOCKET] Unauthorized - not the broadcaster');
            return callback({ success: false, message: 'Unauthorized' });
        }

        if (!poolEntry.isActive || poolEntry.expiresAt < new Date()) {
            console.log('❌ [SOCKET] Broadcast expired');
            return callback({ success: false, message: 'Broadcast has expired' });
        }

        const broadcaster = await User.findById(socket.userId);
        const cost = poolEntry.reservedCoins || 0;
        console.log('💰 [SOCKET] Cost:', cost, '| Balance:', broadcaster.coins);

        if (broadcaster.coins < cost) {
            console.log('❌ [SOCKET] Insufficient coins');
            return callback({
                success: false,
                message: 'Insufficient coins',
                required: cost,
                available: broadcaster.coins
            });
        }

        await broadcaster.deductCoins(cost, 'Accepted connection request');

        const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
        const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        const chat = new Chat({
            type: 'private',
            participants: [socket.userId, request.requester],
            isRandomChat: true,
            expiresAt: chatExpiresAt
        });

        await chat.save();
        await chat.populate('participants', 'username avatar gender age');
        
        console.log('✅ [SOCKET] Chat created:', chat._id);

        request.status = 'accepted';
        await request.save();

        await ConnectionRequest.updateMany(
            {
                poolId: poolEntry._id,
                _id: { $ne: requestId },
                status: 'pending'
            },
            { status: 'rejected' }
        );

        poolEntry.isActive = false;
        poolEntry.reservedCoins = 0;
        await poolEntry.save();

        // Notify requester
        const requesterSocketId = global.userSockets?.get(request.requester.toString());
        console.log('📡 [SOCKET] Emitting request:accepted');
        console.log('📡 [SOCKET] Requester socket:', requesterSocketId);
        console.log('📡 [SOCKET] Broadcaster socket:', socket.id);
        
        if (requesterSocketId) {
            io.to(requesterSocketId).emit('request:accepted', {
                request: request.toObject(),
                chat: chat.toObject()
            });
            console.log('✅ [SOCKET] request:accepted emitted to requester');
        } else {
            console.log('⚠️ [SOCKET] Requester not connected');
        }

        // Notify broadcaster
        io.to(socket.id).emit('request:accepted', {
            request: request.toObject(),
            chat: chat.toObject()
        });
        console.log('✅ [SOCKET] request:accepted emitted to broadcaster');

        callback({
            success: true,
            message: 'Request accepted, chat created',
            data: {
                chat: chat.toObject(),
                request: request.toObject(),
                balance: broadcaster.coins
            }
        });
    } catch (error) {
        console.error('❌ [SOCKET] Accept request error:', error);
        callback({ success: false, message: 'Error accepting request', error: error.message });
    }
};

// Reject Connection Request (via Socket.IO)
const handleRejectRequest = async (socket, io, data, callback) => {
    try {
        const { requestId } = data;

        const request = await ConnectionRequest.findById(requestId).populate('poolId');
        if (!request || request.status !== 'pending') {
            return callback({ success: false, message: 'Request not found or already processed' });
        }

        const poolEntry = request.poolId;
        if (!poolEntry || poolEntry.sender.toString() !== socket.userId) {
            return callback({ success: false, message: 'Unauthorized' });
        }

        request.status = 'rejected';
        await request.save();

        const requesterSocketId = global.userSockets?.get(request.requester.toString());
        if (requesterSocketId) {
            io.to(requesterSocketId).emit('request:rejected', {
                requestId: request._id.toString(),
                poolId: poolEntry._id.toString()
            });
        }

        callback({
            success: true,
            message: 'Request rejected',
            data: { request: request.toObject() }
        });
    } catch (error) {
        console.error('Reject request error:', error);
        callback({ success: false, message: 'Error rejecting request', error: error.message });
    }
};

module.exports = {
    handleInitiateSend,
    handleGetActivePool,
    handleAcceptSend,
    handleExtendChat,
    handleSendConnectionRequest,
    handleGetConnectionRequests,
    handleAcceptRequest,
    handleRejectRequest
};
