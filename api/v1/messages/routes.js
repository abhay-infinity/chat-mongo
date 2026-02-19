const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('./controller');
const { auth } = require('../../../middleware/auth.middleware');
const { upload, handleMulterError } = require('../../../middleware/upload.middleware');
const validate = require('../../../middleware/validate.middleware');

// Validation
const sendMessageValidation = [
    body('chatId').notEmpty().withMessage('Chat ID is required'),
    body('content').optional().trim(),
    body('type').optional().isIn(['text', 'image', 'video', 'audio', 'file', 'location'])
];

// Routes
router.get('/:chatId', auth, messageController.getMessages);
router.post('/', auth, sendMessageValidation, validate, messageController.sendMessage);
router.post('/upload', auth, upload.single('media'), handleMulterError, messageController.uploadMedia);
router.delete('/:messageId', auth, messageController.deleteMessage);
router.put('/:chatId/read', auth, messageController.markAsRead);

module.exports = router;
