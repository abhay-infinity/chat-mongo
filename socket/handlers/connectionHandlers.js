const User = require('../../model/User.model');
const Chat = require('../../model/Chat.model');
const { setUserOnline, setUserOffline } = require('../../config/redis');

/**
 * Connection Event Handlers
 * Handle socket connection and disconnection with presence tracking
 */

// Handle new connection
const handleConnection = async (socket, io) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.user.username})`);

    // Store socket connection in global map
    if (!global.userSockets) {
        global.userSockets = new Map();
    }
    global.userSockets.set(socket.userId, socket.id);

    // Update user status in Redis (fast)
    setUserOnline(socket.userId, socket.id).catch(err =>
        console.error('Redis online error:', err)
    );

    // Update user status in MongoDB (persistent)
    User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
    }).catch(err =>
        console.error('DB online error:', err)
    );

    // Notify contacts about online status
    socket.broadcast.emit('user:online', {
        userId: socket.userId,
        username: socket.user.username,
        timestamp: new Date()
    });

    // Auto-join user's chat rooms
    Chat.find({ participants: socket.userId, isActive: true })
        .select('_id')
        .lean()
        .then(chats => {
            chats.forEach(chat => {
                socket.join(chat._id.toString());
                console.log(`🚪 User ${socket.userId} auto-joined room: ${chat._id}`);
            });
        })
        .catch(err => console.error('Auto-join rooms error:', err));
};

// Handle disconnection
const handleDisconnect = async (socket, io) => {
    console.log(`❌ User disconnected: ${socket.userId} (${socket.user.username})`);

    // Remove from global map
    if (global.userSockets) {
        global.userSockets.delete(socket.userId);
    }

    // Update user status in Redis
    setUserOffline(socket.userId).catch(err =>
        console.error('Redis offline error:', err)
    );

    // Update user status in MongoDB
    User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
    }).catch(err =>
        console.error('DB offline error:', err)
    );

    // Notify contacts about offline status
    socket.broadcast.emit('user:offline', {
        userId: socket.userId,
        username: socket.user.username,
        lastSeen: new Date()
    });
};

module.exports = {
    handleConnection,
    handleDisconnect
};
