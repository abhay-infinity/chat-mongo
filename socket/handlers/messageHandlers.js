const Message = require('../../model/Message.model');
const Chat = require('../../model/Chat.model');
const { getCache, setCache, deleteCache } = require('../../config/redis');

/**
 * Message Event Handlers
 * All message-related socket events with Redis caching
 */

// Get messages with Redis caching
const handleGetMessages = async (socket, data, callback) => {
    try {
        const { chatId, page = 1, limit = 50 } = data;
        const cacheKey = `messages:chat:${chatId}:page:${page}:limit:${limit}`;

        // Check Redis cache first
        let cachedData = await getCache(cacheKey);

        if (cachedData) {
            console.log(`✅ Cache hit for messages:get - Chat: ${chatId}`);
            return callback({
                success: true,
                data: cachedData,
                cached: true
            });
        }

        // Verify user is part of the chat
        const chat = await Chat.findOne({
            _id: chatId,
            participants: socket.userId
        }).lean();

        if (!chat) {
            return callback({ success: false, message: 'Chat not found' });
        }

        // Fetch messages from database
        const messages = await Message.find({ chat: chatId })
            .populate('sender', '-password')
            .populate('replyTo')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Message.countDocuments({ chat: chatId });

        const responseData = {
            messages: messages.reverse(),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };

        // Cache for 2 minutes (messages change frequently)
        await setCache(cacheKey, responseData, 2 * 60);

        callback({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Get messages error:', error);
        callback({ success: false, message: 'Error fetching messages', error: error.message });
    }
};

// Send message
const handleSendMessage = async (socket, io, data, callback) => {
    try {
        const { chatId, content, type = 'text', replyTo, media, location } = data;
        console.log(`📩 Message from ${socket.userId} in ${chatId}`);

        // Verify user is part of the chat (check cache first)
        const chatCacheKey = `chat:${chatId}`;
        let chat = await getCache(chatCacheKey);

        if (!chat) {
            chat = await Chat.findOne({
                _id: chatId,
                participants: socket.userId
            });

            if (!chat) {
                const errorMsg = { success: false, message: 'Chat not found' };
                return callback ? callback(errorMsg) : socket.emit('error', errorMsg);
            }
        } else {
            // If from cache, need to get full document for save
            chat = await Chat.findById(chatId);
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

        // Invalidate caches
        await deleteCache(chatCacheKey);
        await invalidateMessagesCache(chatId);
        for (const participantId of chat.participants) {
            await invalidateUserChatsCache(participantId.toString());
        }

        // Emit message to all participants in the chat room
        io.to(chatId).emit('message:new', {
            message: message.toObject(),
            chatId
        });

        // Send success response
        if (callback) {
            callback({ success: true, data: { message: message.toObject() } });
        }

        // Check for offline users for notification
        const offlineParticipants = chat.participants.filter(
            p => p.toString() !== socket.userId && !global.userSockets?.has(p.toString())
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
};

// Delete message
const handleDeleteMessage = async (socket, io, data, callback) => {
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

        // Invalidate cache
        await invalidateMessagesCache(chatId);

        // Notify all participants
        io.to(chatId).emit('message:deleted', { messageId, chatId });

        callback({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Delete message error:', error);
        callback({ success: false, message: 'Error deleting message', error: error.message });
    }
};

// Mark message as read
const handleMarkAsRead = async (socket, io, data, callback) => {
    try {
        const { messageId, chatId } = data;

        await Message.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: { user: socket.userId, readAt: new Date() } }
        });

        // Invalidate cache
        await invalidateMessagesCache(chatId);

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
};

// Mark message as delivered
const handleMarkAsDelivered = async (socket, io, data, callback) => {
    try {
        const { messageId, chatId } = data;

        await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deliveredTo: { user: socket.userId, deliveredAt: new Date() } }
        });

        // Invalidate cache
        await invalidateMessagesCache(chatId);

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
};

// Helper: Invalidate messages cache for a chat
const invalidateMessagesCache = async (chatId) => {
    // Delete all pagination variations
    for (let page = 1; page <= 20; page++) {
        for (let limit of [20, 50, 100]) {
            await deleteCache(`messages:chat:${chatId}:page:${page}:limit:${limit}`);
        }
    }
};

// Helper: Invalidate user's chat list cache
const invalidateUserChatsCache = async (userId) => {
    for (let page = 1; page <= 10; page++) {
        for (let limit of [10, 20, 50]) {
            await deleteCache(`chats:user:${userId}:page:${page}:limit:${limit}`);
        }
    }
};

// Add reaction to message
const handleAddReaction = async (socket, io, data, callback) => {
    try {
        const { messageId, emoji } = data;
        const validEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
        
        if (!validEmojis.includes(emoji)) {
            return callback({ success: false, message: 'Invalid emoji' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return callback({ success: false, message: 'Message not found' });
        }

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
            r => r.user.toString() !== socket.userId.toString()
        );

        // Add new reaction
        message.reactions.push({
            user: socket.userId,
            emoji: emoji
        });

        await message.save();
        await message.populate('reactions.user', 'username avatar');

        // Invalidate cache
        await invalidateMessagesCache(message.chat.toString());

        // Emit to all participants
        io.to(message.chat.toString()).emit('message:reaction', {
            messageId: message._id,
            reactions: message.reactions
        });

        callback({ success: true, data: { message: message.toObject() } });
    } catch (error) {
        console.error('Add reaction error:', error);
        callback({ success: false, message: 'Error adding reaction', error: error.message });
    }
};

// Remove reaction from message
const handleRemoveReaction = async (socket, io, data, callback) => {
    try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
            return callback({ success: false, message: 'Message not found' });
        }

        message.reactions = message.reactions.filter(
            r => r.user.toString() !== socket.userId.toString()
        );

        await message.save();
        await message.populate('reactions.user', 'username avatar');

        // Invalidate cache
        await invalidateMessagesCache(message.chat.toString());

        // Emit to all participants
        io.to(message.chat.toString()).emit('message:reaction', {
            messageId: message._id,
            reactions: message.reactions
        });

        callback({ success: true, data: { message: message.toObject() } });
    } catch (error) {
        console.error('Remove reaction error:', error);
        callback({ success: false, message: 'Error removing reaction', error: error.message });
    }
};

module.exports = {
    handleGetMessages,
    handleSendMessage,
    handleDeleteMessage,
    handleMarkAsRead,
    handleMarkAsDelivered,
    handleAddReaction,
    handleRemoveReaction
};
