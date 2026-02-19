const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file', 'location'],
        default: 'text'
    },
    media: {
        url: String,
        thumbnail: String,
        filename: String,
        size: Number,
        mimeType: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: [Number], // [longitude, latitude]
        address: String
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    deliveredTo: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deliveredAt: {
            type: Date,
            default: Date.now
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes for faster queries
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
