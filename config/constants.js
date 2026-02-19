module.exports = {
    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',

    // OTP
    OTP_EXPIRE_MINUTES: 10,
    OTP_LENGTH: 6,

    // File Upload
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mpeg', 'video/quicktime'],

    // Location
    DEFAULT_SEARCH_RADIUS: 5000, // 5km in meters
    MAX_SEARCH_RADIUS: 50000, // 50km

    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // Chat
    MAX_MESSAGE_LENGTH: 5000,
    MAX_GROUP_MEMBERS: 256,

    // Rate Limiting
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100,
};
