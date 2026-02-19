const User = require('../../../model/User.model');
const { setCache, getCache, deleteCache } = require('../../../config/redis');

// Get Coin Balance
exports.getCoinBalance = async (req, res) => {
    try {
        // Check cache first
        let user = await getCache(`user:${req.userId}`);

        if (!user) {
            user = await User.findById(req.userId).select('coins coinTransactions');
            if (user) {
                await setCache(`user:${req.userId}`, user.toJSON(), 24 * 60 * 60);
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                coins: user.coins,
                recentTransactions: user.coinTransactions?.slice(-10) || []
            }
        });
    } catch (error) {
        console.error('Get coin balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching coin balance',
            error: error.message
        });
    }
};

// Add Coins (Admin or rewards)
exports.addCoins = async (req, res) => {
    try {
        const { amount, reason, type = 'bonus' } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const newBalance = await user.addCoins(amount, reason, type);

        // Update cache
        await setCache(`user:${req.userId}`, user.toJSON(), 24 * 60 * 60);

        res.json({
            success: true,
            message: `${amount} coins added successfully`,
            data: {
                coins: newBalance,
                transaction: {
                    type,
                    amount,
                    reason
                }
            }
        });
    } catch (error) {
        console.error('Add coins error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding coins',
            error: error.message
        });
    }
};

// Deduct Coins (for features)
exports.deductCoins = async (req, res) => {
    try {
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.hasEnoughCoins(amount)) {
            return res.status(402).json({
                success: false,
                message: 'Insufficient coins',
                required: amount,
                available: user.coins
            });
        }

        const newBalance = await user.deductCoins(amount, reason);

        // Update cache
        await setCache(`user:${req.userId}`, user.toJSON(), 24 * 60 * 60);

        res.json({
            success: true,
            message: `${amount} coins deducted successfully`,
            data: {
                coins: newBalance,
                transaction: {
                    type: 'spend',
                    amount: -amount,
                    reason
                }
            }
        });
    } catch (error) {
        console.error('Deduct coins error:', error);

        if (error.message === 'Insufficient coins') {
            return res.status(402).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error deducting coins',
            error: error.message
        });
    }
};

// Get Transaction History
exports.getTransactionHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const user = await User.findById(req.userId).select('coinTransactions');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const transactions = user.coinTransactions || [];
        const total = transactions.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);

        const paginatedTransactions = transactions
            .reverse()
            .slice(startIndex, endIndex);

        res.json({
            success: true,
            data: {
                transactions: paginatedTransactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transaction history',
            error: error.message
        });
    }
};

// Daily Bonus (Free coins every day)
exports.claimDailyBonus = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already claimed today
        const today = new Date().toDateString();
        const lastBonus = user.coinTransactions
            .filter(t => t.type === 'bonus' && t.reason === 'Daily Bonus')
            .pop();

        if (lastBonus && new Date(lastBonus.createdAt).toDateString() === today) {
            return res.status(400).json({
                success: false,
                message: 'Daily bonus already claimed today',
                nextClaimIn: 'Tomorrow'
            });
        }

        // Give daily bonus
        const bonusAmount = 10;
        const newBalance = await user.addCoins(bonusAmount, 'Daily Bonus', 'bonus');

        // Update cache
        await setCache(`user:${req.userId}`, user.toJSON(), 24 * 60 * 60);

        res.json({
            success: true,
            message: `Daily bonus claimed! +${bonusAmount} coins`,
            data: {
                coins: newBalance,
                bonusAmount
            }
        });
    } catch (error) {
        console.error('Claim daily bonus error:', error);
        res.status(500).json({
            success: false,
            message: 'Error claiming daily bonus',
            error: error.message
        });
    }
};

const { getDynamicCoinPrices, getAppSetting } = require('../../../utils/settings');

exports.getCoinPrices = async (req, res) => {
    try {
        const prices = await getDynamicCoinPrices();
        res.json({
            success: true,
            data: {
                prices
            }
        });
    } catch (error) {
        console.error('Get coin prices error:', error);
        res.status(500).json({ success: false, message: 'Error fetching coin prices' });
    }
};

// Watch Ad for Reward
exports.watchAdReward = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const adReward = await getAppSetting('reward.ad_watch', 50);
        const newBalance = await user.addCoins(adReward, 'Watched Ad Reward', 'earn');

        // Update cache
        await setCache(`user:${req.userId}`, user.toJSON(), 24 * 60 * 60);

        res.json({
            success: true,
            message: `Reward claimed! +${adReward} coins`,
            data: {
                coins: newBalance,
                reward: adReward
            }
        });
    } catch (error) {
        console.error('Watch ad reward error:', error);
        res.status(500).json({ success: false, message: 'Error claiming ad reward' });
    }
};

