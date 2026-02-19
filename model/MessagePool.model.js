const mongoose = require('mongoose');

const messagePoolSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        default: 'Hey! Want to chat?'
    },
    preferences: {
        gender: {
            type: String,
            enum: ['male', 'female', 'any'],
            default: 'any'
        },
        ageRange: {
            type: String,
            default: 'any'
        }
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
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index: documents expire at the specified date
    }
}, {
    timestamps: true
});

// Create geospatial index for location-based queries
messagePoolSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('MessagePool', messagePoolSchema);
