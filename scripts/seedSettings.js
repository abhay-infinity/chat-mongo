const mongoose = require('mongoose');
const Settings = require('../models/Settings.model');
require('dotenv').config({ path: '../.env' });

const seedSettings = async () => {
    try {
        const mongoUri = process.env.nearbychat_MONGODB_URI || 'mongodb://localhost:27000/near-by-chat';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const defaults = Settings.getDefaults();
        for (const [key, data] of Object.entries(defaults)) {
            await Settings.findOneAndUpdate(
                { key },
                { key, ...data },
                { upsert: true, new: true }
            );
            console.log(`Updated setting: ${key}`);
        }

        console.log('✅ Settings seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedSettings();
