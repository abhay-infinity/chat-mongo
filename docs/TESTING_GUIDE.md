# 🧪 Testing Guide - Nearby Chat

## 📋 Available Testing Methods

You have **3 ways** to test the Nearby Chat application:

### 1. 🌐 Web Test Client (Interactive UI)
### 2. 📮 Postman Collection (API Testing)
### 3. 🤖 Automated Test Scripts (Command Line)

---

## 1️⃣ Web Test Client

### How to Use:
1. Make sure the server is running: `npm run dev`
2. Open your browser: `http://localhost:5000/test-client.html`
3. Follow the on-screen instructions

### Features:
- ✅ Beautiful interactive UI
- ✅ Register and login
- ✅ Update location
- ✅ Find nearby users
- ✅ Connect Socket.IO
- ✅ Send real-time messages
- ✅ See typing indicators
- ✅ Activity log

### Perfect For:
- Manual testing
- Visual feedback
- Learning the API
- Demo purposes

---

## 2️⃣ Postman Collection

### Setup:
1. Open Postman
2. Click **Import**
3. Select file: `Nearby_Chat_API.postman_collection.json`
4. Collection will be imported with all endpoints

### Features:
- ✅ **Automatic token management** - Login once, token saved automatically
- ✅ **Variable management** - User ID, Chat ID auto-saved
- ✅ **32+ API endpoints** ready to test
- ✅ **Organized folders** by feature
- ✅ **Pre-configured requests**

### How to Use:

#### Step 1: Register a User
- Go to: `1. Authentication` → `Register User`
- Click **Send**
- Token and User ID will be saved automatically ✅

#### Step 2: Test Other Endpoints
All endpoints will now use the saved token automatically!

**Examples:**
- `2. Users` → `Update Location` - Update your location
- `2. Users` → `Get Nearby Users` - Find nearby users
- `3. Chats` → `Create Private Chat` - Create a chat
- `4. Messages` → `Send Text Message` - Send a message

### Variables (Auto-managed):
- `{{authToken}}` - Your JWT token
- `{{userId}}` - Your user ID
- `{{chatId}}` - Current chat ID
- `{{messageId}}` - Last message ID
- `{{groupId}}` - Current group ID

### Perfect For:
- API testing
- Debugging
- Development
- Documentation

---

## 3️⃣ Automated Test Scripts

### Test Script 1: Complete API Test

**File:** `test-api.js`

**What it tests:**
- ✅ User registration
- ✅ User login
- ✅ Get current user
- ✅ Update location
- ✅ Get nearby users
- ✅ Search users
- ✅ Get all chats
- ✅ Create private chat
- ✅ Send message
- ✅ Get messages
- ✅ Socket.IO connection
- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Update profile
- ✅ Create group

**How to run:**
```bash
# Make sure server is running in another terminal
npm run dev

# In a new terminal, run the test
npm test

# Or directly
node test-api.js
```

**Output:**
- Colored console output
- Test results for each endpoint
- Success/failure summary
- Success rate percentage

**Perfect For:**
- Automated testing
- CI/CD pipelines
- Quick validation
- Regression testing

---

### Test Script 2: Socket.IO Real-time Test

**File:** `test-socket.js`

**What it tests:**
- ✅ Creates 2 users
- ✅ Creates a chat between them
- ✅ Connects both via Socket.IO
- ✅ Simulates real conversation
- ✅ Tests typing indicators
- ✅ Tests message delivery
- ✅ Tests real-time events

**How to run:**
```bash
# Make sure server is running
npm run dev

# In a new terminal
npm run test:socket

# Or directly
node test-socket.js
```

**Output:**
- Live conversation simulation
- Real-time message flow
- Typing indicators
- Connection status
- Detailed logs

**Perfect For:**
- Socket.IO testing
- Real-time feature validation
- Demo of chat functionality
- Understanding message flow

---

### Test Script 3: Run All Tests

**How to run:**
```bash
npm run test:all
```

This will run both test scripts sequentially.

---

## 📊 Quick Testing Workflow

### For Quick Check:
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run automated tests
npm test
```

### For Full Testing:
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run all tests
npm run test:all

# Browser: Open test client
http://localhost:5000/test-client.html

# Postman: Import and test manually
```

---

## 🎯 Testing Checklist

### ✅ Authentication
- [ ] Register new user
- [ ] Login with credentials
- [ ] Get current user
- [ ] OTP send/verify
- [ ] Logout

### ✅ User Management
- [ ] Update profile
- [ ] Update location
- [ ] Get nearby users
- [ ] Search users
- [ ] Block/unblock users
- [ ] Upload avatar

### ✅ Chats
- [ ] Get all chats
- [ ] Create private chat
- [ ] Get chat by ID
- [ ] Mute/unmute chat
- [ ] Clear unread count
- [ ] Delete chat

### ✅ Messages
- [ ] Get messages
- [ ] Send text message
- [ ] Send media message
- [ ] Delete message
- [ ] Mark as read

### ✅ Groups
- [ ] Create group
- [ ] Update group
- [ ] Add members
- [ ] Remove members
- [ ] Leave group
- [ ] Upload group avatar

### ✅ Real-time (Socket.IO)
- [ ] Connect to socket
- [ ] Join chat room
- [ ] Send real-time message
- [ ] Receive real-time message
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Online/offline status
- [ ] Location updates

---

## 🐛 Troubleshooting

### Server not responding?
```bash
# Check if server is running
curl http://localhost:5000/health

# Should return: {"status":"OK",...}
```

### MongoDB connection error?
```bash
# Start MongoDB
sudo systemctl start mongodb

# Or
mongod
```

### Redis connection error?
```bash
# Start Redis
sudo systemctl start redis

# Or
redis-server
```

### Test script failing?
```bash
# Make sure dependencies are installed
npm install

# Check if server is running
curl http://localhost:5000/health
```

### Socket.IO not connecting?
- Check if server is running
- Check console for errors
- Verify JWT token is valid
- Check CORS settings

---

## 📝 Test Results Interpretation

### Automated Test Output:

```
✅ User registered successfully!
✅ Login successful!
✅ Location updated successfully!
❌ Failed to get nearby users: No users found
```

**Legend:**
- ✅ Green = Test passed
- ❌ Red = Test failed
- ℹ️ Blue = Information
- ⚠️ Yellow = Warning

### Success Rate:
- **100%** = Perfect! All features working
- **90-99%** = Excellent, minor issues
- **80-89%** = Good, some features need attention
- **Below 80%** = Needs debugging

---

## 🎓 Tips for Testing

1. **Start Simple**: Begin with web test client
2. **Use Postman**: For detailed API testing
3. **Automate**: Use test scripts for regression testing
4. **Check Logs**: Server logs show detailed errors
5. **Test Real-time**: Socket.IO test shows live features
6. **Sequential Testing**: Test in order (register → login → chat → message)

---

## 📞 Need Help?

1. Check server logs in the terminal
2. Check browser console (F12)
3. Review API documentation in README.md
4. Check QUICK_REFERENCE.md for commands
5. Review ARCHITECTURE.md for system design

---

**Happy Testing! 🚀**

All three methods are ready to use. Choose based on your needs:
- **Quick check?** → Automated tests
- **Manual testing?** → Web client or Postman
- **Real-time demo?** → Socket.IO test script
