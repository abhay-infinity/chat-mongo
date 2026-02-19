const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(process.env.nearbychat_MONGODB_URI, options);

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error;
    }
};

module.exports = { connectDB };
