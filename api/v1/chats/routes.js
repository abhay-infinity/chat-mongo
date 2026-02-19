const express = require('express');
const router = express.Router();
const chatController = require('./controller');
const { auth } = require('../../../middleware/auth.middleware');

// Specific routes first to avoid parameter collision
router.get('/', auth, chatController.getAllChats);
router.post('/initiate-send', auth, chatController.initiateSend);
router.get('/pool', auth, chatController.getActivePool);
router.post('/accept-send/:poolId', auth, chatController.acceptSend);
router.post('/generate-random-data', auth, chatController.generateRandomData);

// Connection Request routes
router.post('/send-request/:poolId', auth, chatController.sendConnectionRequest);
router.get('/requests/:poolId', auth, chatController.getConnectionRequests);
router.post('/accept-request/:requestId', auth, chatController.acceptRequest);
router.post('/reject-request/:requestId', auth, chatController.rejectRequest);
router.delete('/cancel-broadcast/:poolId', auth, chatController.cancelBroadcast);

// Parameterized routes
router.get('/:chatId', auth, chatController.getChatById);
router.post('/private/:userId', auth, chatController.getOrCreatePrivateChat);
router.delete('/:chatId', auth, chatController.deleteChat);
router.put('/:chatId/mute', auth, chatController.toggleMuteChat);
router.put('/:chatId/pin', auth, chatController.togglePinChat);
router.put('/:chatId/archive', auth, chatController.toggleArchiveChat);
router.put('/:chatId/clear-unread', auth, chatController.clearUnreadCount);
router.delete('/:chatId/messages', auth, chatController.clearChat);
router.post('/extend-chat/:chatId', auth, chatController.extendChat);

module.exports = router;
