# 🎲 Random Data Generator - README

## Quick Overview

This feature allows you to generate **200 chats with 100 messages each** for testing purposes. **YOU** (the authenticated user) will be a participant in **ALL 200 chats**.

## 🚀 How to Use

### 1. Make sure your server is running
```bash
npm start
```

### 2. Login to get your authentication token
```bash
POST /nearbychatapi/v1/auth/login
```

### 3. Call the random data generation API
```bash
POST /nearbychatapi/v1/chats/generate-random-data
Authorization: Bearer YOUR_TOKEN
```

### 4. View your chats
```bash
GET /nearbychatapi/v1/chats
Authorization: Bearer YOUR_TOKEN
```

You should see 200 chats! 🎉

## 📊 What Gets Created

- **200 new users** (random names, emails, profiles)
- **200 chats** (you + 1 random user in each)
- **20,000 messages** (100 per chat)

## ⏱️ How Long Does It Take?

**1-3 minutes** depending on your server performance.

You'll see progress in the console:
```
✅ Authenticated user: yourUsername
Creating 200 random users...
Created 50/200 users...
Created 100/200 users...
...
Creating 200 chats with 100 messages each...
All chats will include authenticated user: yourUsername
...
Random data generation completed!
```

## 📖 Documentation

- **Full API Docs**: `docs/RANDOM_DATA_API.md`
- **Quick Start Guide**: `docs/QUICK_START_RANDOM_DATA.md`
- **Implementation Details**: `docs/IMPLEMENTATION_SUMMARY.md`

## 🧪 Test Script

Run the test script:
```bash
# Edit the file first to add your auth token
node test-random-data-generator.js
```

## ⚠️ Important Notes

1. **You are in ALL chats**: Unlike typical random data, YOU are a participant in every chat
2. **Development only**: Don't run this in production!
3. **Database impact**: Creates 20,400 database records
4. **Multiple runs**: Running again will create MORE data (not replace)

## ✅ Verification Checklist

After running:
- [ ] API returns success response
- [ ] Response shows 200 users, 200 chats, 20,000 messages
- [ ] `GET /chats` returns 200 chats
- [ ] All chats include your user ID
- [ ] Messages are visible in each chat

## 🐛 Troubleshooting

**"Authenticated user not found"**
→ Make sure you're logged in with a valid token

**API is slow**
→ Normal! It's creating 20,400 records. Wait 1-3 minutes.

**Can't see chats**
→ Make sure you're using the same account that called the API

## 🎯 Use Cases

Perfect for testing:
- Chat list UI with many chats
- Message loading and pagination
- Search functionality
- Performance with realistic data
- Demo presentations

## 📞 Need Help?

Check the documentation files in the `docs/` folder or review the implementation in `api/v1/chats/controller.js`.

---

**Happy Testing! 🚀**
