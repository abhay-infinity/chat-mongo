const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import database initialization
require('./model/dbinit').connect();

// Import configurations
const { connectRedis } = require('./config/redis');
const socketHandler = require('./socket');

const app = express();
const server = http.createServer(app);

// Socket.IO configuration for Vercel compatibility
const io = socketIO(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Enable both transports for Vercel
    transports: ['polling', 'websocket'],
    // Vercel has 30s timeout, so adjust accordingly
    pingTimeout: 25000,
    pingInterval: 10000,
    // Explicit path
    path: '/socket.io/',
    // Allow upgrades
    allowUpgrades: true,
    // Increase max HTTP buffer size
    maxHttpBufferSize: 1e6,
    // Cookie settings
    cookie: false
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cookieParser());
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));
app.set('trust proxy', 1);
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Static files
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION;
const uploadsPath = isVercel ? '/tmp/uploads' : path.join(__dirname, 'public/uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Make io instance available to routes
app.set('io', io);

// API Routes
app.use(['/nearbychatapi', '/api'], require('./api'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Initialize Socket.IO
socketHandler(io);

// Database connections
const PORT = process.env.PORT || 5000;

// Connect to Redis immediately (non-blocking)
connectRedis().then((client) => {
    if (client) {
        console.log('✅ Redis connected successfully');
    } else {
        console.log('⚠️  Running without Redis - some features may be limited');
    }
}).catch(err => {
    console.error('❌ Failed to connect to Redis:', err.message || err);
    console.log('⚠️  App will continue without Redis');
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;
