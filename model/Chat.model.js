const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['private', 'group'],
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    groupName: {
        type: String,
        trim: true
    },
    groupAvatar: {
        type: String
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    },
    mutedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    pinnedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    archivedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    expiresAt: {
        type: Date,
        index: { expires: 0 } // TTL index for automatic deletion of expired chats
    },
    isRandomChat: {
        type: Boolean,
        default: false
    },
    extensionCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for faster queries
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ updatedAt: -1 });

// Compound index for finding private chats between two users
chatSchema.index({ type: 1, participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);
