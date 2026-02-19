const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } = require('../config/constants');

// Detect if running on Vercel (serverless environment)
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION;

// Use /tmp for Vercel, public/uploads for local
const getBaseUploadPath = () => {
    if (isVercel) {
        return '/tmp/uploads';
    }
    return path.join(__dirname, '../public/uploads');
};

// Ensure upload directories exist
const baseUploadPath = getBaseUploadPath();
const uploadDirs = [
    path.join(baseUploadPath, 'avatars'),
    path.join(baseUploadPath, 'messages'),
    path.join(baseUploadPath, 'groups')
];

uploadDirs.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        console.warn(`Warning: Could not create directory ${dir}:`, error.message);
    }
});

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(baseUploadPath, 'messages');

        if (req.path.includes('avatar')) {
            uploadPath = path.join(baseUploadPath, 'avatars');
        } else if (req.path.includes('group')) {
            uploadPath = path.join(baseUploadPath, 'groups');
        }

        // Ensure the specific directory exists before saving
        try {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
        } catch (error) {
            console.error('Error creating upload directory:', error);
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, 'audio/mpeg', 'audio/wav'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, and audio files are allowed.'), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

module.exports = { upload, handleMulterError };
