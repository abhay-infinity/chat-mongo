/**
 * Main Socket.IO Handler
 * Modular, organized, and optimized with Redis caching
 */

const socketAuthMiddleware = require('./middleware/auth');
const { handleConnection, handleDisconnect } = require('./handlers/connectionHandlers');
const chatHandlers = require('./handlers/chatHandlers');
const messageHandlers = require('./handlers/messageHandlers');
const typingHandlers = require('./handlers/typingHandlers');
const poolHandlers = require('./handlers/poolHandlers');
const userHandlers = require('./handlers/userHandlers');

module.exports = (io) => {
    // ==================== AUTHENTICATION MIDDLEWARE ====================
    io.use(socketAuthMiddleware);

    // ==================== CONNECTION HANDLER ====================
    io.on('connection', async (socket) => {
        // Handle connection
        await handleConnection(socket, io);

        // ==================== CHAT OPERATIONS ====================
        socket.on('chats:getAll', (data, callback) =>
            chatHandlers.handleGetAllChats(socket, data, callback)
        );

        socket.on('chat:getById', (data, callback) =>
            chatHandlers.handleGetChatById(socket, data, callback)
        );

        socket.on('chat:createPrivate', (data, callback) =>
            chatHandlers.handleCreatePrivateChat(socket, data, callback)
        );

        socket.on('chat:delete', (data, callback) =>
            chatHandlers.handleDeleteChat(socket, data, callback)
        );

        socket.on('chat:toggleMute', (data, callback) =>
            chatHandlers.handleToggleMute(socket, data, callback)
        );

        socket.on('chat:clearUnread', (data, callback) =>
            chatHandlers.handleClearUnread(socket, data, callback)
        );

        socket.on('chat:join', (data, callback) =>
            chatHandlers.handleJoinChat(socket, data, callback)
        );

        socket.on('chat:leave', (data, callback) =>
            chatHandlers.handleLeaveChat(socket, data, callback)
        );

        // ==================== MESSAGE OPERATIONS ====================
        socket.on('messages:get', (data, callback) =>
            messageHandlers.handleGetMessages(socket, data, callback)
        );

        socket.on('message:send', (data, callback) =>
            messageHandlers.handleSendMessage(socket, io, data, callback)
        );

        socket.on('message:delete', (data, callback) =>
            messageHandlers.handleDeleteMessage(socket, io, data, callback)
        );

        socket.on('message:read', (data, callback) =>
            messageHandlers.handleMarkAsRead(socket, io, data, callback)
        );

        socket.on('message:delivered', (data, callback) =>
            messageHandlers.handleMarkAsDelivered(socket, io, data, callback)
        );

        // ==================== TYPING INDICATORS ====================
        socket.on('typing:start', (data, callback) =>
            typingHandlers.handleTypingStart(socket, io, data, callback)
        );

        socket.on('typing:stop', (data, callback) =>
            typingHandlers.handleTypingStop(socket, io, data, callback)
        );

        // ==================== RANDOM CHAT / MESSAGE POOL ====================
        socket.on('pool:initiateSend', (data, callback) =>
            poolHandlers.handleInitiateSend(socket, io, data, callback)
        );

        socket.on('pool:getActive', (data, callback) =>
            poolHandlers.handleGetActivePool(socket, data, callback)
        );

        socket.on('pool:acceptSend', (data, callback) =>
            poolHandlers.handleAcceptSend(socket, io, data, callback)
        );

        socket.on('chat:extend', (data, callback) =>
            poolHandlers.handleExtendChat(socket, io, data, callback)
        );

        // ==================== USER OPERATIONS ====================
        socket.on('location:update', (data, callback) =>
            userHandlers.handleUpdateLocation(socket, data, callback)
        );

        socket.on('users:search', (data, callback) =>
            userHandlers.handleSearchUsers(socket, data, callback)
        );

        socket.on('users:nearby', (data, callback) =>
            userHandlers.handleGetNearbyUsers(socket, data, callback)
        );

        // ==================== DISCONNECT HANDLER ====================
        socket.on('disconnect', async () => {
            await handleDisconnect(socket, io);
        });

        // ==================== ERROR HANDLER ====================
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    return io;
};
