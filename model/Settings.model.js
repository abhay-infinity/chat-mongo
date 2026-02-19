const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    category: {
        type: String,
        enum: ['coins', 'features', 'general', 'limits'],
        default: 'general'
    },
    description: {
        type: String,
        default: ''
    },
    updatedBy: {
        type: String,
        default: 'admin'
    }
}, {
    timestamps: true
});

// Default settings
settingsSchema.statics.getDefaults = function () {
    return {
        // Coin Prices
        'coin.send_request': { value: 25, category: 'coins', description: 'Coins for broadcasting a message' },
        'coin.age_filter_extra': { value: 5, category: 'coins', description: 'Extra coins for age-specific selection' },
        'coin.extend_chat_24h': { value: 50, category: 'coins', description: 'Coins to extend chat by 24 hours' },
        'coin.extend_chat_48h': { value: 90, category: 'coins', description: 'Coins to extend chat by 48 hours' },
        'coin.text_message': { value: 0, category: 'coins', description: 'Coins for text message' },
        'coin.image_message': { value: 2, category: 'coins', description: 'Coins for image message' },

        // Coin Rewards
        'reward.guest_signup': { value: 50, category: 'coins', description: 'Welcome coins for guest users' },
        'reward.full_signup': { value: 150, category: 'coins', description: 'Welcome coins for full registration' },
        'reward.ad_watch': { value: 50, category: 'coins', description: 'Coins for watching an ad' },
        'reward.daily_bonus': { value: 5, category: 'coins', description: 'Daily bonus coins' },

        // Feature Toggles
        'feature.guest_login': { value: true, category: 'features', description: 'Enable guest login' },
        'feature.random_chat': { value: true, category: 'features', description: 'Enable anonymous random chat' },

        // Limits
        'limit.chat_expiry_hours': { value: 24, category: 'limits', description: 'Default chat expiry time in hours' },
        'limit.pool_expiry_minutes': { value: 60, category: 'limits', description: 'Chat request pool expiry in minutes' }
    };
};

module.exports = mongoose.model('Settings', settingsSchema);
