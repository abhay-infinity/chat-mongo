const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const userController = require('./controller');
const { auth } = require('../../../middleware/auth.middleware');
const { upload, handleMulterError } = require('../../../middleware/upload.middleware');
const validate = require('../../../middleware/validate.middleware');

// Validation rules
const updateProfileValidation = [
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters'),
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Bio must not exceed 200 characters'),
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'unknown'])
        .withMessage('Invalid gender value'),
    body('age')
        .optional()
        .isInt({ min: 13, max: 100 })
        .withMessage('Age must be between 13 and 100'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Address must not exceed 200 characters')
];

const updateLocationValidation = [
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
    body('address')
        .optional()
        .trim()
];

const nearbyUsersValidation = [
    query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
    query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
    query('radius')
        .optional()
        .isInt({ min: 100, max: 50000 })
        .withMessage('Radius must be between 100 and 50000 meters')
];

// Routes
router.get('/config', auth, userController.getAppConfig); // App initialization API
router.get('/profile/:userId', auth, userController.getUserProfile);
router.put('/profile', auth, updateProfileValidation, validate, userController.updateProfile);
router.put('/location', auth, updateLocationValidation, validate, userController.updateLocation);
router.get('/nearby', auth, nearbyUsersValidation, validate, userController.getNearbyUsers);
router.get('/search', auth, userController.searchUsers);
router.put('/settings', auth, userController.updateSettings);
router.post('/block/:userId', auth, userController.blockUser);
router.delete('/block/:userId', auth, userController.unblockUser);
router.post('/wave/:userId', auth, userController.sendWave);
router.post('/fcm-token', auth, userController.updateFcmToken);
router.post('/avatar', auth, upload.single('avatar'), handleMulterError, userController.uploadAvatar);

module.exports = router;
