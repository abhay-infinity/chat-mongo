const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema({
    poolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MessagePool',
        required: true,
        index: true
    },
    broadcaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'expired'],
        default: 'pending',
        index: true
    },
    message: {
        type: String,
        maxlength: 200,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index: documents expire at the specified date
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
connectionRequestSchema.index({ poolId: 1, status: 1 });
connectionRequestSchema.index({ broadcaster: 1, status: 1 });
connectionRequestSchema.index({ requester: 1, status: 1 });
connectionRequestSchema.index({ poolId: 1, requester: 1 }); // Prevent duplicate requests

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
