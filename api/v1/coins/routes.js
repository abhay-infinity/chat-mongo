const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const coinController = require('./controller');
const { auth, requireFullAccount } = require('../../../middleware/auth.middleware');
const validate = require('../../../middleware/validate.middleware');

// Validation
const coinTransactionValidation = [
    body('amount')
        .isInt({ min: 1 })
        .withMessage('Amount must be a positive integer'),
    body('reason')
        .trim()
        .notEmpty()
        .withMessage('Reason is required')
];

// Routes
router.get('/balance', auth, coinController.getCoinBalance);
router.get('/prices', coinController.getCoinPrices);
router.get('/transactions', auth, coinController.getTransactionHistory);
router.post('/daily-bonus', auth, coinController.claimDailyBonus);
router.post('/add', auth, requireFullAccount, coinTransactionValidation, validate, coinController.addCoins);
router.post('/deduct', auth, coinTransactionValidation, validate, coinController.deductCoins);
router.post('/watch-ad', auth, coinController.watchAdReward);

module.exports = router;
