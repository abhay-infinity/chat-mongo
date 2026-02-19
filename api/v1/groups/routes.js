const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const groupController = require('./controller');
const { auth } = require('../../../middleware/auth.middleware');
const { upload, handleMulterError } = require('../../../middleware/upload.middleware');
const validate = require('../../../middleware/validate.middleware');

// Validation
const createGroupValidation = [
    body('groupName')
        .trim()
        .notEmpty()
        .withMessage('Group name is required')
        .isLength({ min: 3, max: 50 })
        .withMessage('Group name must be between 3 and 50 characters'),
    body('participants')
        .isArray({ min: 2 })
        .withMessage('At least 2 participants are required')
];

// Routes
router.post('/', auth, createGroupValidation, validate, groupController.createGroup);
router.put('/:groupId', auth, groupController.updateGroup);
router.post('/:groupId/members', auth, groupController.addMembers);
router.delete('/:groupId/members/:userId', auth, groupController.removeMember);
router.post('/:groupId/leave', auth, groupController.leaveGroup);
router.post('/:groupId/avatar', auth, upload.single('avatar'), handleMulterError, groupController.uploadGroupAvatar);

module.exports = router;
