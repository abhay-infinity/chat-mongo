const { setTyping } = require('../../config/redis');

/**
 * Typing Indicator Handlers
 * Real-time typing status with Redis
 */

// Start typing
const handleTypingStart = async (socket, io, data, callback) => {
    try {
        const { chatId } = data;

        // Store in Redis with 10 second expiry
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
};

// Stop typing
const handleTypingStop = async (socket, io, data, callback) => {
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
};

module.exports = {
    handleTypingStart,
    handleTypingStop
};
