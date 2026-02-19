const express = require('express');
const router = express.Router();

/**
 * Socket.IO Health Check API
 * Test if Socket.IO is working on Vercel
 */

// Get Socket.IO status
router.get('/socket-status', (req, res) => {
    try {
        const io = req.app.get('io');

        if (!io) {
            return res.status(500).json({
                success: false,
                message: 'Socket.IO not initialized',
                status: 'error'
            });
        }

        // Get connected sockets count
        const socketsCount = io.engine.clientsCount || 0;

        // Get all rooms
        const rooms = [];
        io.sockets.adapter.rooms.forEach((value, key) => {
            // Skip default rooms (socket IDs)
            if (!io.sockets.sockets.has(key)) {
                rooms.push(key);
            }
        });

        return res.json({
            success: true,
            message: 'Socket.IO is working!',
            status: 'healthy',
            data: {
                isInitialized: true,
                connectedClients: socketsCount,
                activeRooms: rooms.length,
                rooms: rooms.slice(0, 10), // Show first 10 rooms
                serverTime: new Date().toISOString(),
                platform: process.env.VERCEL ? 'Vercel' : 'Local',
                nodeVersion: process.version
            }
        });
    } catch (error) {
        console.error('Socket status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking Socket.IO status',
            error: error.message,
            status: 'error'
        });
    }
});

// Test Socket.IO emit
router.post('/socket-test-emit', (req, res) => {
    try {
        const io = req.app.get('io');

        if (!io) {
            return res.status(500).json({
                success: false,
                message: 'Socket.IO not initialized'
            });
        }

        const { event = 'test:message', data = { message: 'Test from API' } } = req.body;

        // Emit test event to all connected clients
        io.emit(event, data);

        return res.json({
            success: true,
            message: 'Test event emitted successfully',
            data: {
                event,
                payload: data,
                connectedClients: io.engine.clientsCount || 0,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Socket emit error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error emitting Socket.IO event',
            error: error.message
        });
    }
});

// Get detailed Socket.IO info
router.get('/socket-info', (req, res) => {
    try {
        const io = req.app.get('io');

        if (!io) {
            return res.status(500).json({
                success: false,
                message: 'Socket.IO not initialized'
            });
        }

        // Get all connected sockets
        const sockets = [];
        io.sockets.sockets.forEach((socket) => {
            sockets.push({
                id: socket.id,
                connected: socket.connected,
                rooms: Array.from(socket.rooms),
                userId: socket.userId || null,
                username: socket.user?.username || null
            });
        });

        // Get all rooms with participant count
        const roomsInfo = [];
        io.sockets.adapter.rooms.forEach((sockets, roomName) => {
            // Skip default rooms (socket IDs)
            if (!io.sockets.sockets.has(roomName)) {
                roomsInfo.push({
                    room: roomName,
                    participants: sockets.size,
                    socketIds: Array.from(sockets)
                });
            }
        });

        return res.json({
            success: true,
            data: {
                totalConnections: io.engine.clientsCount || 0,
                sockets: sockets,
                rooms: roomsInfo,
                serverInfo: {
                    platform: process.env.VERCEL ? 'Vercel' : 'Local',
                    nodeVersion: process.version,
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Socket info error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting Socket.IO info',
            error: error.message
        });
    }
});

module.exports = router;
