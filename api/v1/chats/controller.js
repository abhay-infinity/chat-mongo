const Chat = require('../../../model/Chat.model');
const Message = require('../../../model/Message.model');
const User = require('../../../model/User.model');
const MessagePool = require('../../../model/MessagePool.model');
const ConnectionRequest = require('../../../model/ConnectionRequest.model');
const { getAppSetting } = require('../../../utils/settings');

// Get All Chats
exports.getAllChats = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const chats = await Chat.find({
            participants: req.userId,
            isActive: true
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .populate('groupAdmin', '-password')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Chat.countDocuments({
            participants: req.userId,
            isActive: true
        });

        res.json({
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
        res.status(500).json({
            success: false,
            message: 'Error fetching chats',
            error: error.message
        });
    }
};

// Get or Create Private Chat
exports.getOrCreatePrivateChat = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const otherUser = await User.findById(userId);
        if (!otherUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if chat already exists
        let chat = await Chat.findOne({
            type: 'private',
            participants: { $all: [req.userId, userId] }
        })
            .populate('participants', '-password')
            .populate('lastMessage');

        // Create new chat if doesn't exist
        if (!chat) {
            chat = new Chat({
                type: 'private',
                participants: [req.userId, userId]
            });
            await chat.save();
            await chat.populate('participants', '-password');
        }

        res.json({
            success: true,
            data: { chat }
        });
    } catch (error) {
        console.error('Get or create private chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating chat',
            error: error.message
        });
    }
};

// Get Chat by ID
exports.getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .populate('groupAdmin', '-password');

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        res.json({
            success: true,
            data: { chat }
        });
    } catch (error) {
        console.error('Get chat by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching chat',
            error: error.message
        });
    }
};

// Delete Chat
exports.deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // For group chats, only admin can delete
        if (chat.type === 'group' && chat.groupAdmin.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can delete the group'
            });
        }

        chat.isActive = false;
        await chat.save();

        res.json({
            success: true,
            message: 'Chat deleted successfully'
        });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting chat',
            error: error.message
        });
    }
};

// Mute/Unmute Chat
exports.toggleMuteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { mute } = req.body;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        if (mute) {
            if (!chat.mutedBy.includes(req.userId)) {
                chat.mutedBy.push(req.userId);
            }
        } else {
            chat.mutedBy = chat.mutedBy.filter(id => id.toString() !== req.userId.toString());
        }

        await chat.save();

        res.json({
            success: true,
            message: mute ? 'Chat muted' : 'Chat unmuted',
            data: { chat }
        });
    } catch (error) {
        console.error('Toggle mute chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating chat',
            error: error.message
        });
    }
};

// Pin/Unpin Chat
exports.togglePinChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { pin } = req.body;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        if (pin) {
            if (!chat.pinnedBy.includes(req.userId)) {
                chat.pinnedBy.push(req.userId);
            }
        } else {
            chat.pinnedBy = chat.pinnedBy.filter(id => id.toString() !== req.userId.toString());
        }

        await chat.save();

        res.json({
            success: true,
            message: pin ? 'Chat pinned' : 'Chat unpinned',
            data: { chat }
        });
    } catch (error) {
        console.error('Toggle pin chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating chat',
            error: error.message
        });
    }
};

// Archive/Unarchive Chat
exports.toggleArchiveChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { archive } = req.body;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        if (archive) {
            if (!chat.archivedBy.includes(req.userId)) {
                chat.archivedBy.push(req.userId);
            }
        } else {
            chat.archivedBy = chat.archivedBy.filter(id => id.toString() !== req.userId.toString());
        }

        await chat.save();

        res.json({
            success: true,
            message: archive ? 'Chat archived' : 'Chat unarchived',
            data: { chat }
        });
    } catch (error) {
        console.error('Toggle archive chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating chat',
            error: error.message
        });
    }
};

// Clear Unread Count
exports.clearUnreadCount = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        chat.unreadCount.set(req.userId.toString(), 0);
        await chat.save();

        res.json({
            success: true,
            message: 'Unread count cleared'
        });
    } catch (error) {
        console.error('Clear unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing unread count',
            error: error.message
        });
    }
};

// Initiate Send (Anonymous Request Pool)
exports.initiateSend = async (req, res) => {
    try {
        console.log('📤 [API] POST /initiate-send | User:', req.userId);
        const { message, preferences, location } = req.body;
        console.log('📤 [API] Body:', { message, preferences, location: location ? 'provided' : 'missing' });
        
        const user = await User.findById(req.userId);

        if (!user) {
            console.log('❌ [API] User not found:', req.userId);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Calculate cost
        let cost = await getAppSetting('coin.send_request', 10);
        if (preferences && (preferences.gender !== 'any' || preferences.ageRange !== 'any')) {
            cost += await getAppSetting('coin.age_filter_extra', 5);
        }
        console.log('💰 [API] Calculated cost:', cost, '| User coins:', user.coins);

        // Check coins
        if (user.coins < cost) {
            console.log('❌ [API] Insufficient coins:', { required: cost, available: user.coins });
            return res.status(400).json({
                success: false,
                message: 'Insufficient coins',
                required: cost,
                available: user.coins
            });
        }

        // RESERVE coins (don't deduct yet - will deduct when accepting a request)
        // Coins will be available again if broadcast is cancelled

        // ================= AUTO-MATCH LOGIC =================
        // Check if there is someone compatible ALREADY in the pool
        const matchQuery = {
            isActive: true,
            expiresAt: { $gt: new Date() },
            sender: { $ne: req.userId }
        };

        // Filter by gender if specified
        if (preferences && preferences.gender && preferences.gender !== 'any') {
            matchQuery['preferences.gender'] = { $in: [user.gender, 'any'] };
        }

        const potentialMatch = await MessagePool.findOne(matchQuery)
            .populate('sender', 'username avatar gender age');

        if (potentialMatch) {
            // Check if WE are also compatible with THEM
            const theyAreAny = potentialMatch.preferences.gender === 'any';
            const weMatchThem = theyAreAny || potentialMatch.preferences.gender === user.gender;

            if (weMatchThem) {
                // MATCH FOUND! 🚀 Create chat immediately
                // Deduct coins immediately for auto-match
                await user.deductCoins(cost, 'Auto-matched random chat');
                
                const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
                const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

                const chat = new Chat({
                    type: 'private',
                    participants: [potentialMatch.sender._id, req.userId],
                    isRandomChat: true,
                    expiresAt: chatExpiresAt
                });

                await chat.save();

                // Deactivate the matched pool entry
                potentialMatch.isActive = false;
                potentialMatch.reservedCoins = 0; // Clear reserved coins
                await potentialMatch.save();

                await chat.populate('participants', 'username avatar gender age');
                
                console.log('✅ [API] Auto-matched! Chat created:', chat._id);
                console.log('📥 [API] Response: auto-matched, chat created');

                return res.status(201).json({
                    success: true,
                    message: 'Auto-Matched with a sender immediately!',
                    data: { chat: chat.toObject(), balance: user.coins, isMatched: true }
                });
            }
        }
        // ====================================================

        // No match found, Add to Pool instead
        const poolExpiryMinutes = await getAppSetting('limit.pool_expiry_minutes', 60);
        const expiresAt = new Date(Date.now() + poolExpiryMinutes * 60 * 1000);

        // Create Pool Entry with reserved coins
        const poolEntry = new MessagePool({
            sender: req.userId,
            message: message || 'Hey! Want to chat?',
            preferences: preferences || { gender: 'any', ageRange: 'any' },
            location: location || { type: 'Point', coordinates: [0, 0] },
            expiresAt,
            reservedCoins: cost  // Store reserved amount
        });

        await poolEntry.save();
        await poolEntry.populate('sender', 'username avatar gender age');
        const poolEntryObj = poolEntry.toObject();
        const io = req.app.get('io');
        if (io) io.emit('pool:new', { poolEntry: poolEntryObj });

        console.log('✅ [API] Pool entry created:', poolEntry._id);
        console.log('📥 [API] Response: poolEntry created, reservedCoins:', cost);

        res.status(201).json({
            success: true,
            message: 'Broadcast created. Waiting for connection requests.',
            data: { 
                poolEntry: poolEntryObj, 
                balance: user.coins, 
                reservedCoins: cost,
                isMatched: false 
            }
        });
    } catch (error) {
        console.error('❌ [API] Initiate send error:', error);
        res.status(500).json({
            success: false,
            message: 'Error initiating send',
            error: error.message
        });
    }
};

// Get Active Pool (For Map View)
exports.getActivePool = async (req, res) => {
    try {
        console.log('📤 [API] GET /pool | User:', req.userId);
        const { latitude, longitude, radius = 5000 } = req.query;
        console.log('📤 [API] Query:', { latitude, longitude, radius });

        let query = {
            isActive: true,
            expiresAt: { $gt: new Date() },
            sender: { $ne: req.userId } // Don't show own requests
        };

        let poolEntries;
        
        // If location provided, use geospatial query
        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            const maxDistance = parseFloat(radius);

            poolEntries = await MessagePool.find({
                ...query,
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
        } else {
            poolEntries = await MessagePool.find(query)
                .populate('sender', 'username avatar gender age')
                .lean();
        }

        // Calculate distance if location provided
        const entriesWithDistance = poolEntries.map(entry => {
            const result = { ...entry };
            if (latitude && longitude && entry.location?.coordinates) {
                const [entryLng, entryLat] = entry.location.coordinates;
                // Haversine formula for distance calculation
                const R = 6371000; // Earth radius in meters
                const dLat = (entryLat - parseFloat(latitude)) * Math.PI / 180;
                const dLon = (entryLng - parseFloat(longitude)) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(parseFloat(latitude) * Math.PI / 180) *
                    Math.cos(entryLat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;
                result.distance = Math.round(distance); // in meters
            }
            return result;
        });

        console.log('✅ [API] Found', entriesWithDistance.length, 'pool entries');
        console.log('📥 [API] Response: pool entries list');

        res.json({
            success: true,
            data: { poolEntries: entriesWithDistance }
        });
    } catch (error) {
        console.error('Get active pool error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pool',
            error: error.message
        });
    }
};

// Accept Send (Start Anonymous Chat)
exports.acceptSend = async (req, res) => {
    try {
        const { poolId } = req.params;

        const poolEntry = await MessagePool.findById(poolId);
        if (!poolEntry || !poolEntry.isActive || poolEntry.expiresAt < new Date()) {
            return res.status(404).json({
                success: false,
                message: 'Request no longer available'
            });
        }

        // Create a new timed chat
        const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
        const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        const chat = new Chat({
            type: 'private',
            participants: [poolEntry.sender, req.userId],
            isRandomChat: true,
            expiresAt: chatExpiresAt
        });

        await chat.save();

        // Deactivate pool entry (it will be auto-deleted by TTL soon, but mark inactive for immediate results)
        poolEntry.isActive = false;
        await poolEntry.save();

        await chat.populate('participants', 'username avatar gender age');

        res.status(201).json({
            success: true,
            message: 'Chat started successfully',
            data: { chat }
        });
    } catch (error) {
        console.error('Accept send error:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting chat',
            error: error.message
        });
    }
};

// Send Connection Request (Receiver sends request to broadcaster)
exports.sendConnectionRequest = async (req, res) => {
    try {
        console.log('📤 [API] POST /send-request/:poolId | User:', req.userId);
        const { poolId } = req.params;
        const { message } = req.body;
        console.log('📤 [API] Params:', { poolId });
        console.log('📤 [API] Body:', { message: message || '(empty)' });

        const poolEntry = await MessagePool.findById(poolId);
        if (!poolEntry || !poolEntry.isActive || poolEntry.expiresAt < new Date()) {
            return res.status(404).json({
                success: false,
                message: 'Broadcast no longer available'
            });
        }

        // Can't send request to own broadcast
        if (poolEntry.sender.toString() === req.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send request to your own broadcast'
            });
        }

        // Check if request already exists
        const existingRequest = await ConnectionRequest.findOne({
            poolId,
            requester: req.userId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'Request already sent'
            });
        }

        // Create connection request
        const request = new ConnectionRequest({
            poolId,
            broadcaster: poolEntry.sender,
            requester: req.userId,
            message: message || '',
            expiresAt: poolEntry.expiresAt
        });

        await request.save();
        await request.populate('requester', 'username avatar gender age');
        
        console.log('✅ [API] Connection request created:', request._id);
        console.log('📥 [API] Response: request created');

        // Notify broadcaster via Socket.IO
        const io = req.app.get('io');
        if (io) {
            const broadcasterSocketId = global.userSockets?.get(poolEntry.sender.toString());
            console.log('📡 [SOCKET] Emitting request:new to broadcaster:', broadcasterSocketId);
            if (broadcasterSocketId) {
                io.to(broadcasterSocketId).emit('request:new', {
                    request: request.toObject()
                });
                console.log('✅ [SOCKET] request:new emitted to broadcaster');
            } else {
                console.log('⚠️ [SOCKET] Broadcaster not connected, cannot emit request:new');
            }
        } else {
            console.log('⚠️ [SOCKET] IO instance not available');
        }

        res.status(201).json({
            success: true,
            message: 'Connection request sent',
            data: { request: request.toObject() }
        });
    } catch (error) {
        console.error('Send connection request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending request',
            error: error.message
        });
    }
};

// Get Connection Requests (For broadcaster to see all requests)
exports.getConnectionRequests = async (req, res) => {
    try {
        console.log('📤 [API] GET /requests/:poolId | User:', req.userId);
        const { poolId } = req.params;
        console.log('📤 [API] Params:', { poolId });

        const poolEntry = await MessagePool.findById(poolId);
        if (!poolEntry) {
            return res.status(404).json({
                success: false,
                message: 'Broadcast not found'
            });
        }

        // Only broadcaster can see requests (normalize to string: req.userId may be string from cache or ObjectId from DB)
        const senderId = String(poolEntry.sender);
        const userId = String(req.userId);
        if (senderId !== userId) {
            console.log('📤 [API] 403 broadcaster mismatch | sender:', senderId, '| req.userId:', userId);
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - Only broadcaster can view requests'
            });
        }

        const requests = await ConnectionRequest.find({
            poolId,
            status: 'pending'
        })
            .populate('requester', 'username avatar gender age')
            .sort({ createdAt: -1 });

        console.log('✅ [API] Found', requests.length, 'connection requests');
        console.log('📥 [API] Response: requests list');

        res.json({
            success: true,
            data: { requests: requests.map(r => r.toObject()) }
        });
    } catch (error) {
        console.error('Get connection requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching requests',
            error: error.message
        });
    }
};

// Accept Connection Request (Broadcaster accepts a request)
exports.acceptRequest = async (req, res) => {
    try {
        console.log('📤 [API] POST /accept-request/:requestId | User:', req.userId);
        const { requestId } = req.params;
        console.log('📤 [API] Params:', { requestId });

        const request = await ConnectionRequest.findById(requestId)
            .populate('poolId');

        if (!request || request.status !== 'pending') {
            return res.status(404).json({
                success: false,
                message: 'Request not found or already processed'
            });
        }

        const poolEntry = request.poolId;
        if (!poolEntry) {
            return res.status(404).json({
                success: false,
                message: 'Broadcast not found'
            });
        }

        // Verify broadcaster owns this pool (normalize to string for cache/DB id type mismatch)
        if (String(poolEntry.sender) !== String(req.userId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - Only broadcaster can accept requests'
            });
        }

        // Check if pool is still active
        if (!poolEntry.isActive || poolEntry.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Broadcast has expired'
            });
        }

        // Deduct coins NOW (when accepting)
        const broadcaster = await User.findById(req.userId);
        const cost = poolEntry.reservedCoins || 0;

        if (broadcaster.coins < cost) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient coins',
                required: cost,
                available: broadcaster.coins
            });
        }

        // Deduct coins
        await broadcaster.deductCoins(cost, 'Accepted connection request');

        // Create chat
        const expiryHours = await getAppSetting('limit.chat_expiry_hours', 24);
        const chatExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        const chat = new Chat({
            type: 'private',
            participants: [req.userId, request.requester],
            isRandomChat: true,
            expiresAt: chatExpiresAt
        });

        await chat.save();
        await chat.populate('participants', 'username avatar gender age');
        
        console.log('✅ [API] Chat created:', chat._id);
        console.log('✅ [API] Participants:', chat.participants.map(p => p._id || p.username));

        // Update request status
        request.status = 'accepted';
        await request.save();

        // Reject other pending requests for this pool
        await ConnectionRequest.updateMany(
            {
                poolId: poolEntry._id,
                _id: { $ne: requestId },
                status: 'pending'
            },
            { status: 'rejected' }
        );

        // Deactivate pool entry
        poolEntry.isActive = false;
        poolEntry.reservedCoins = 0;
        await poolEntry.save();
        const io = req.app.get('io');
        if (io) io.emit('pool:removed', { poolId: poolEntry._id.toString() });

        // Notify requester and broadcaster via Socket.IO
        if (io) {
            const requesterSocketId = global.userSockets?.get(request.requester.toString());
            const broadcasterSocketId = global.userSockets?.get(req.userId);
            
            console.log('📡 [SOCKET] Emitting request:accepted');
            console.log('📡 [SOCKET] Requester socket:', requesterSocketId);
            console.log('📡 [SOCKET] Broadcaster socket:', broadcasterSocketId);
            
            if (requesterSocketId) {
                io.to(requesterSocketId).emit('request:accepted', {
                    request: request.toObject(),
                    chat: chat.toObject()
                });
                console.log('✅ [SOCKET] request:accepted emitted to requester');
            } else {
                console.log('⚠️ [SOCKET] Requester not connected');
            }

            if (broadcasterSocketId) {
                io.to(broadcasterSocketId).emit('request:accepted', {
                    request: request.toObject(),
                    chat: chat.toObject()
                });
                console.log('✅ [SOCKET] request:accepted emitted to broadcaster');
            } else {
                console.log('⚠️ [SOCKET] Broadcaster not connected');
            }
        } else {
            console.log('⚠️ [SOCKET] IO instance not available');
        }

        console.log('📥 [API] Response: request accepted, chat created');
        console.log('💰 [API] Broadcaster balance:', broadcaster.coins);

        res.status(201).json({
            success: true,
            message: 'Request accepted, chat created',
            data: { 
                chat: chat.toObject(), 
                request: request.toObject(),
                balance: broadcaster.coins
            }
        });
    } catch (error) {
        console.error('Accept request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error accepting request',
            error: error.message
        });
    }
};

// Reject Connection Request (Broadcaster rejects a single request)
exports.rejectRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await ConnectionRequest.findById(requestId).populate('poolId');
        if (!request || request.status !== 'pending') {
            return res.status(404).json({
                success: false,
                message: 'Request not found or already processed'
            });
        }

        const poolEntry = request.poolId;
        if (!poolEntry || String(poolEntry.sender) !== String(req.userId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - Only broadcaster can reject requests for their pool'
            });
        }

        request.status = 'rejected';
        await request.save();

        const io = req.app.get('io');
        if (io) {
            const requesterSocketId = global.userSockets?.get(request.requester.toString());
            if (requesterSocketId) {
                io.to(requesterSocketId).emit('request:rejected', {
                    requestId: request._id.toString(),
                    poolId: poolEntry._id.toString()
                });
            }
        }

        return res.json({
            success: true,
            message: 'Request rejected',
            data: { request: request.toObject() }
        });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting request',
            error: error.message
        });
    }
};

// Cancel Broadcast (Refund coins)
exports.cancelBroadcast = async (req, res) => {
    try {
        const { poolId } = req.params;

        const poolEntry = await MessagePool.findById(poolId);
        if (!poolEntry) {
            return res.status(404).json({
                success: false,
                message: 'Broadcast not found'
            });
        }

        // Only broadcaster can cancel (normalize to string for cache/DB id type mismatch)
        if (String(poolEntry.sender) !== String(req.userId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - Only broadcaster can cancel'
            });
        }

        // Coins were reserved, not deducted, so they're already available
        // But we can add a small bonus for cancelling early (optional)
        const reservedCoins = poolEntry.reservedCoins || 0;

        // Deactivate pool
        poolEntry.isActive = false;
        poolEntry.reservedCoins = 0;
        await poolEntry.save();

        // Reject all pending requests
        const rejectedCount = await ConnectionRequest.updateMany(
            { poolId, status: 'pending' },
            { status: 'rejected' }
        );

        // Notify requesters via Socket.IO and broadcast pool:removed for real-time radar/signals
        const io = req.app.get('io');
        if (io) {
            io.emit('pool:removed', { poolId: poolId.toString() });
            const requests = await ConnectionRequest.find({ poolId });
            requests.forEach(r => {
                const requesterSocketId = global.userSockets?.get(r.requester.toString());
                if (requesterSocketId) {
                    io.to(requesterSocketId).emit('broadcast:cancelled', {
                        poolId: poolId.toString()
                    });
                }
            });
        }

        res.json({
            success: true,
            message: 'Broadcast cancelled. Coins are available again.',
            data: {
                reservedCoins,
                rejectedRequests: rejectedCount.modifiedCount
            }
        });
    } catch (error) {
        console.error('Cancel broadcast error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling broadcast',
            error: error.message
        });
    }
};

// Extend Chat Duration
exports.extendChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { hours } = req.body; // 24 or 48

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId,
            isRandomChat: true
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Timed chat not found'
            });
        }

        const user = await User.findById(req.userId);

        // Define costs
        let cost = 0;
        if (hours === 24) {
            cost = await getAppSetting('coin.extend_chat_24h', 50);
        } else if (hours === 48) {
            cost = await getAppSetting('coin.extend_chat_48h', 90);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid extension duration' });
        }

        if (user.coins < cost) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient coins',
                required: cost,
                available: user.coins
            });
        }

        // Deduct coins
        await user.deductCoins(cost, `Extended chat by ${hours} hours`);

        // Update expiry
        const currentExpiry = chat.expiresAt > new Date() ? chat.expiresAt : new Date();
        chat.expiresAt = new Date(currentExpiry.getTime() + hours * 60 * 60 * 1000);
        chat.extensionCount += 1;
        await chat.save();

        res.json({
            success: true,
            message: `Chat extended by ${hours} hours`,
            data: { expiresAt: chat.expiresAt, balance: user.coins }
        });
    } catch (error) {
        console.error('Extend chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error extending chat',
            error: error.message
        });
    }
};

// Generate Random Data (200 Chats with 100 Messages Each)
// Generate 10 Random Chats with Messages
exports.generateRandomData = async (req, res) => {
  try {
    console.log('🚀 Generating 10 chats for user:', req.userId);

    /* ------------------ STATIC DATA ------------------ */

    const firstNames = [
      'John','Jane','Mike','Sarah','David','Emily','Chris','Lisa',
      'Tom','Anna','Robert','Maria','James','Linda','Michael'
    ];

    const lastNames = [
      'Smith','Johnson','Williams','Brown','Jones','Garcia',
      'Miller','Davis','Rodriguez','Martinez'
    ];

    const messageTemplates = [
      'Hey! How are you?', 'What’s up?', 'Nice to meet you!',
      'How was your day?', 'Sounds good!', 'Haha 😂',
      'Tell me more!', 'I agree with you.', 'Cool 😎',
      'Let’s catch up soon!', 'Talk later!', 'Take care!'
    ];

    const genders = ['male', 'female', 'other'];

    /* ------------------ AUTH USER ------------------ */

    const authUser = await User.findById(req.userId);
    if (!authUser) {
      return res.status(404).json({
        success: false,
        message: 'Authenticated user not found'
      });
    }

    /* ------------------ STEP 1: ENSURE 50 USERS ------------------ */

    let otherUsers = await User.find({
      _id: { $ne: authUser._id }
    }).limit(50);

    const usersToCreate = 50 - otherUsers.length;

    for (let i = 0; i < usersToCreate; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Date.now()}${i}`;

      const newUser = new User({
        username,
        email: `${username}@example.com`,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        password: 'password123',
        gender: genders[Math.floor(Math.random() * genders.length)],
        age: Math.floor(Math.random() * 40) + 18,
        isEmailVerified: true,
        isPhoneVerified: true
      });

      await newUser.save();
      otherUsers.push(newUser);
    }

    /* ------------------ STEP 2: CREATE 10 CHATS ------------------ */

    const createdChats = [];

    for (let i = 0; i < 10; i++) {

      const randomUser =
        otherUsers[Math.floor(Math.random() * otherUsers.length)];

      // Check existing chat
      let chat = await Chat.findOne({
        type: 'private',
        participants: { $all: [authUser._id, randomUser._id] }
      });

      if (chat) continue; // skip duplicate

      // Create chat
      chat = new Chat({
        type: 'private',
        participants: [authUser._id, randomUser._id],
        isActive: true,
        isRandomChat: true,
        unreadCount: new Map()
      });

      await chat.save();

      /* ------------------ STEP 3: CREATE 100 MESSAGES ------------------ */

      const messages = [];

      for (let m = 0; m < 100; m++) {
        const sender = m % 2 === 0 ? authUser._id : randomUser._id;
        const receiver = m % 2 === 0 ? randomUser._id : authUser._id;

        messages.push({
          chat: chat._id,
          sender,
          content: messageTemplates[
            Math.floor(Math.random() * messageTemplates.length)
          ],
          type: 'text',
          deliveredTo: [{ user: receiver, deliveredAt: new Date() }],
          createdAt: new Date(Date.now() - (100 - m) * 60000)
        });
      }

      const savedMessages = await Message.insertMany(messages);

      // Update chat meta
      chat.lastMessage = savedMessages[savedMessages.length - 1]._id;
      chat.unreadCount.set(authUser._id.toString(), Math.floor(Math.random() * 5));
      chat.unreadCount.set(randomUser._id.toString(), Math.floor(Math.random() * 5));
      await chat.save();

      createdChats.push({
        chatId: chat._id,
        withUser: randomUser.username,
        messages: savedMessages.length
      });
    }

    /* ------------------ RESPONSE ------------------ */

    res.status(201).json({
      success: true,
      message: '10 random chats generated successfully',
      totalChatsCreated: createdChats.length,
      chats: createdChats
    });

  } catch (error) {
    console.error('❌ Generate random chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating random chats',
      error: error.message
    });
  }
};

// Clear Chat (Delete all messages)
exports.clearChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: req.userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Delete all messages in the chat
        await Message.deleteMany({ chat: chatId });

        // Clear lastMessage and unreadCount
        chat.lastMessage = null;
        chat.unreadCount.set(req.userId.toString(), 0);
        await chat.save();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(chatId).emit('chat:cleared', { chatId });
        }

        res.json({
            success: true,
            message: 'Chat cleared successfully'
        });
    } catch (error) {
        console.error('Clear chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing chat',
            error: error.message
        });
    }
};
