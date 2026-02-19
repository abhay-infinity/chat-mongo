const mongoose = require('mongoose')
require('dotenv').config()

class DB {
    static connect() {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }

        mongoose.connect(process.env.nearbychat_MONGODB_URI, options)
            .then(() => console.log('✅ Connected to database..'))
            .catch(error => {
                console.error('❌ Database Connection failed..', error)
            })

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err)
        })

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...')
        })

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected')
        })
    }
}

module.exports = DB
