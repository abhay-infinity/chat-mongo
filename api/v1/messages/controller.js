const Message = require('../../../model/Message.model');
const Chat = require('../../../model/Chat.model');

// Get Messages
exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Verify user is part of the chat
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

        const messages = await Message.find({
            chat: chatId,
            deletedFor: { $ne: req.userId }
        })
            .populate('sender', '-password')
            .populate('replyTo')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Message.countDocuments({
            chat: chatId,
            deletedFor: { $ne: req.userId }
        });

        res.json({
            success: true,
            data: {
                messages: messages.reverse(), // Reverse to show oldest first
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
        res.status(500).json({
            success: false,
            message: 'Error fetching messages',
            error: error.message
        });
    }
};

// Send Message (handled via Socket.IO, but keeping REST endpoint for fallback)
exports.sendMessage = async (req, res) => {
    try {
        const { chatId, content, type = 'text', replyTo } = req.body;

        // Verify user is part of the chat
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

        const message = new Message({
            chat: chatId,
            sender: req.userId,
            content,
            type,
            replyTo: replyTo || undefined
        });

        await message.save();
        await message.populate('sender', '-password');

        // Update chat's last message
        chat.lastMessage = message._id;

        // Increment unread count for other participants
        chat.participants.forEach(participantId => {
            if (participantId.toString() !== req.userId.toString()) {
                const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
                chat.unreadCount.set(participantId.toString(), currentCount + 1);
            }
        });

        await chat.save();

        res.json({
            success: true,
            data: { message }
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
};

// Upload Media Message
exports.uploadMedia = async (req, res) => {
    try {
        const { chatId, type, caption } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Verify user is part of the chat
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

        const mediaUrl = `/uploads/messages/${req.file.filename}`;

        const message = new Message({
            chat: chatId,
            sender: req.userId,
            content: caption || '',
            type: type || 'image',
            media: {
                url: mediaUrl,
                filename: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype
            }
        });

        await message.save();
        await message.populate('sender', '-password');

        // Update chat
        chat.lastMessage = message._id;
        chat.participants.forEach(participantId => {
            if (participantId.toString() !== req.userId.toString()) {
                const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
                chat.unreadCount.set(participantId.toString(), currentCount + 1);
            }
        });
        await chat.save();

        res.json({
            success: true,
            data: { message }
        });
    } catch (error) {
        console.error('Upload media error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading media',
            error: error.message
        });
    }
};

// Delete Message
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { deleteForEveryone = false } = req.body;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (deleteForEveryone) {
            // Only sender can delete for everyone
            if (message.sender.toString() !== req.userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own messages for everyone'
                });
            }
            message.isDeleted = true;
            message.content = 'This message was deleted';
        } else {
            // Delete for self
            if (!message.deletedFor.includes(req.userId)) {
                message.deletedFor.push(req.userId);
            }
        }

        await message.save();

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting message',
            error: error.message
        });
    }
};

// Mark Messages as Read
exports.markAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { messageIds } = req.body;

        await Message.updateMany(
            {
                _id: { $in: messageIds },
                chat: chatId,
                'readBy.user': { $ne: req.userId }
            },
            {
                $push: {
                    readBy: {
                        user: req.userId,
                        readAt: new Date()
                    }
                }
            }
        );

        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking messages as read',
            error: error.message
        });
    }
};
