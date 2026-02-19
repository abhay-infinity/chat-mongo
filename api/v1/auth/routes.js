const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('./controller');
const { auth, optionalAuth } = require('../../../middleware/auth.middleware');
const validate = require('../../../middleware/validate.middleware');

// Validation rules
const guestLoginValidation = [
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('Device ID is required')
];

const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('phone')
        .trim()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
    body('identifier')
        .trim()
        .notEmpty()
        .withMessage('Email, phone, or username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const otpValidation = [
    body('identifier')
        .trim()
        .notEmpty()
        .withMessage('Email or phone is required'),
    body('type')
        .isIn(['email', 'phone'])
        .withMessage('Type must be either email or phone'),
    body('purpose')
        .isIn(['registration', 'login', 'reset_password'])
        .withMessage('Invalid purpose')
];

const verifyOTPValidation = [
    ...otpValidation,
    body('otp')
        .trim()
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
];

// Routes
router.post('/guest-login', guestLoginValidation, validate, authController.guestLogin);
router.post('/register', optionalAuth, registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/send-otp', otpValidation, validate, authController.sendOTP);
router.post('/verify-otp', verifyOTPValidation, validate, authController.verifyOTP);
router.get('/me', auth, authController.getCurrentUser);
router.post('/logout', auth, authController.logout);

module.exports = router;
