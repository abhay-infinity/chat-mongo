const Chat = require('../../model/Chat.model');
const User = require('../../model/User.model');
const { getCache, setCache, deleteCache } = require('../../config/redis');

/**
 * Chat Event Handlers
 * All chat-related socket events with Redis caching
 */

// Get all chats with Redis caching
const handleGetAllChats = async (socket, data, callback) => {
    try {
        const { page = 1, limit = 20 } = data || {};
        const cacheKey = `chats:user:${socket.userId}:page:${page}:limit:${limit}`;

        // Check Redis cache first
        let cachedData = await getCache(cacheKey);

        if (cachedData) {
            console.log(`✅ Cache hit for chats:getAll - User: ${socket.userId}`);
            return callback({
                success: true,
                data: cachedData,
                cached: true
            });
        }

        // Cache miss - fetch from database
        const chats = await Chat.find({
            participants: socket.userId,
            isActive: true
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .populate('groupAdmin', '-password')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Chat.countDocuments({
            participants: socket.userId,
            isActive: true
        });

        const responseData = {
            chats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };

        // Cache for 5 minutes
        await setCache(cacheKey, responseData, 5 * 60);

        callback({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Get all chats error:', error);
        callback({ success: false, message: 'Error fetching chats', error: error.message });
    }
};

// Get chat by ID with Redis caching
const handleGetChatById = async (socket, data, callback) => {
    try {
        const { chatId } = data;
        const cacheKey = `chat:${chatId}`;

        // Check Redis cache
        let chat = await getCache(cacheKey);

        if (chat) {
            console.log(`✅ Cache hit for chat:getById - Chat: ${chatId}`);
            return callback({ success: true, data: { chat }, cached: true });
        }

        // Fetch from database
        chat = await Chat.findOne({
            _id: chatId,
            participants: socket.userId
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .populate('groupAdmin', '-password')
            .lean();

        if (!chat) {
            return callback({ success: false, message: 'Chat not found' });
        }

        // Cache for 10 minutes
        await setCache(cacheKey, chat, 10 * 60);

        callback({ success: true, data: { chat } });
    } catch (error) {
        console.error('Get chat by ID error:', error);
        callback({ success: false, message: 'Error fetching chat', error: error.message });
    }
};

// Create or get private chat
const handleCreatePrivateChat = async (socket, data, callback) => {
    try {
        const { userId } = data;

        // Check if user exists (with Redis cache)
        const userCacheKey = `user:${userId}`;
        let otherUser = await getCache(userCacheKey);

        if (!otherUser) {
            otherUser = await User.findById(userId).lean();
            if (!otherUser) {
                return callback({ success: false, message: 'User not found' });
            }
            await setCache(userCacheKey, otherUser, 24 * 60 * 60);
        }

        // Check if chat already exists
        let chat = await Chat.findOne({
            type: 'private',
            participants: { $all: [socket.userId, userId] }
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .lean();

        // Create new chat if doesn't exist
        if (!chat) {
            const newChat = new Chat({
                type: 'private',
                participants: [socket.userId, userId]
            });
            await newChat.save();

            chat = await Chat.findById(newChat._id)
                .populate('participants', '-password')
                .lean();

            // Both users join the room
            socket.join(chat._id.toString());
            const otherSocketId = global.userSockets?.get(userId);
            if (otherSocketId) {
                socket.to(otherSocketId).socketsJoin(chat._id.toString());
                socket.to(otherSocketId).emit('chat:new', { chat });
            }

            // Invalidate user's chat list cache
            await invalidateUserChatsCache(socket.userId);
            await invalidateUserChatsCache(userId);
        }

        // Cache the chat
        await setCache(`chat:${chat._id}`, chat, 10 * 60);

        callback({ success: true, data: { chat } });
    } catch (error) {
        console.error('Create private chat error:', error);
        callback({ success: false, message: 'Error creating chat', error: error.message });
    }
};

// Delete chat
const handleDeleteChat = async (socket, data, callback) => {
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

        // Invalidate caches
        await deleteCache(`chat:${chatId}`);
        for (const participantId of chat.participants) {
            await invalidateUserChatsCache(participantId.toString());
        }

        // Notify all participants
        socket.to(chatId).emit('chat:deleted', { chatId });

        callback({ success: true, message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('Delete chat error:', error);
        callback({ success: false, message: 'Error deleting chat', error: error.message });
    }
};

// Toggle mute chat
const handleToggleMute = async (socket, data, callback) => {
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

        // Invalidate cache
        await deleteCache(`chat:${chatId}`);
        await invalidateUserChatsCache(socket.userId);

        callback({
            success: true,
            message: mute ? 'Chat muted' : 'Chat unmuted',
            data: { chat }
        });
    } catch (error) {
        console.error('Toggle mute chat error:', error);
        callback({ success: false, message: 'Error updating chat', error: error.message });
    }
};

// Clear unread count
const handleClearUnread = async (socket, data, callback) => {
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

        // Invalidate cache
        await deleteCache(`chat:${chatId}`);
        await invalidateUserChatsCache(socket.userId);

        callback({ success: true, message: 'Unread count cleared' });
    } catch (error) {
        console.error('Clear unread count error:', error);
        callback({ success: false, message: 'Error clearing unread count', error: error.message });
    }
};

// Join chat room
const handleJoinChat = async (socket, data, callback) => {
    try {
        const { chatId } = data;
        console.log(`📡 User ${socket.userId} joining chat: ${chatId}`);

        // Verify user is part of the chat (check cache first)
        const cacheKey = `chat:${chatId}`;
        let chat = await getCache(cacheKey);

        if (!chat) {
            chat = await Chat.findOne({
                _id: chatId,
                participants: socket.userId
            }).lean();

            if (chat) {
                await setCache(cacheKey, chat, 10 * 60);
            }
        }

        if (chat && chat.participants.some(p => p.toString() === socket.userId)) {
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
};

// Leave chat room
const handleLeaveChat = (socket, data, callback) => {
    const { chatId } = data;
    socket.leave(chatId);

    if (callback) {
        callback({ success: true, chatId });
    } else {
        socket.emit('chat:left', { chatId });
    }
};

// Helper: Invalidate user's chat list cache
const invalidateUserChatsCache = async (userId) => {
    // Delete all pagination variations
    for (let page = 1; page <= 10; page++) {
        for (let limit of [10, 20, 50]) {
            await deleteCache(`chats:user:${userId}:page:${page}:limit:${limit}`);
        }
    }
};

module.exports = {
    handleGetAllChats,
    handleGetChatById,
    handleCreatePrivateChat,
    handleDeleteChat,
    handleToggleMute,
    handleClearUnread,
    handleJoinChat,
    handleLeaveChat
};
