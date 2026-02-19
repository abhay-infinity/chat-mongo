const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    identifier: {
        type: String, // email or phone
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['email', 'phone'],
        required: true
    },
    purpose: {
        type: String,
        enum: ['registration', 'login', 'reset_password'],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index - auto delete after expiry
    },
    verified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
otpSchema.index({ identifier: 1, type: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);
