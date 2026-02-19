const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    password: {
        type: String,
        minlength: 6
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'unknown'],
        default: 'unknown'
    },
    age: {
        type: Number,
        min: 13,
        max: 100
    },
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        maxlength: 200,
        default: ''
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        },
        address: {
            type: String,
            default: ''
        }
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isGuest: {
        type: Boolean,
        default: false
    },
    coins: {
        type: Number,
        default: 50,
        min: 0
    },
    coinTransactions: [{
        type: {
            type: String,
            enum: ['earn', 'spend', 'bonus', 'refund'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        reason: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    settings: {
        showOnlineStatus: {
            type: Boolean,
            default: true
        },
        showLocation: {
            type: Boolean,
            default: true
        },
        allowNearbyUsers: {
            type: Boolean,
            default: true
        },
        notifications: {
            messages: { type: Boolean, default: true },
            groups: { type: Boolean, default: true },
            nearbyUsers: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true
});

// Create geospatial index for location-based queries
userSchema.index({ location: '2dsphere' });

// Pre-save hook for password hashing and referral code generation
userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        this.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    if (!this.isModified('password') || !this.password) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

// Coin management methods
userSchema.methods.addCoins = async function (amount, reason, type = 'earn') {
    this.coins += amount;
    this.coinTransactions.push({
        type,
        amount,
        reason
    });
    await this.save();
    return this.coins;
};

userSchema.methods.deductCoins = async function (amount, reason) {
    if (this.coins < amount) {
        throw new Error('Insufficient coins');
    }
    this.coins -= amount;
    this.coinTransactions.push({
        type: 'spend',
        amount: -amount,
        reason
    });
    await this.save();
    return this.coins;
};

userSchema.methods.hasEnoughCoins = function (amount) {
    return this.coins >= amount;
};

module.exports = mongoose.model('User', userSchema);
