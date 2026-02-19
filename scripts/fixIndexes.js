const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixIndexes = async () => {
    try {
        const mongoUri = process.env.nearbychat_MONGODB_URI;
        if (!mongoUri) throw new Error('nearbychat_MONGODB_URI not found in .env');

        console.log('Connecting to:', mongoUri.split('@')[1]); // Log host only for privacy
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        console.log('Dropping existing unique indexes on users collection...');
        try { await collection.dropIndex('email_1'); console.log('Dropped email_1'); } catch (e) { console.log('email_1 does not exist or already dropped'); }
        try { await collection.dropIndex('phone_1'); console.log('Dropped phone_1'); } catch (e) { console.log('phone_1 does not exist or already dropped'); }

        console.log('✅ Indexes dropped. Restarting server will recreate them with sparse: true.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixIndexes();
