# 🚀 Nearby Chat - Quick Reference Guide

## 📝 Environment Setup

Create `.env` file with:
```env
NODE_ENV=development
PORT=5000
nearbychat_MONGODB_URI=mongodb://localhost:27017/nearby-chat
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-here
CLIENT_URL=http://localhost:3000
```

## 🏃 Running the App

```bash
# Start MongoDB
sudo systemctl start mongodb

# Start Redis
sudo systemctl start redis

# Run app (development)
npm run dev

# Run app (production)
npm start
```

## 🧪 Testing

1. **Web Test Client**: http://localhost:5000/test-client.html
2. **Postman**: Import `postman_collection.json`
3. **cURL Examples**: See below

## 📡 Quick API Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "password123"
  }'
```

### Update Location
```bash
curl -X PUT http://localhost:5000/api/users/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": 23.0225,
    "longitude": 72.5714,
    "address": "Ahmedabad, Gujarat"
  }'
```

### Get Nearby Users
```bash
curl -X GET "http://localhost:5000/api/users/nearby?latitude=23.0225&longitude=72.5714&radius=5000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Group
```bash
curl -X POST http://localhost:5000/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "groupName": "My Group",
    "participants": ["USER_ID_1", "USER_ID_2"]
  }'
```

## 🔌 Socket.IO Client Example

```javascript
// Connect
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected!');
});

// Join chat
socket.emit('chat:join', { chatId: 'CHAT_ID' });

// Send message
socket.emit('message:send', {
  chatId: 'CHAT_ID',
  content: 'Hello!',
  type: 'text'
});

// Receive messages
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
});

// Typing indicator
socket.emit('typing:start', { chatId: 'CHAT_ID' });
socket.emit('typing:stop', { chatId: 'CHAT_ID' });

// Listen for typing
socket.on('typing:user', (data) => {
  console.log(`${data.username} is typing...`);
});
```

## 🗂️ File Structure Quick Reference

```
Key Files:
├── server.js                      # Main entry point
├── config/
│   ├── database.js               # MongoDB setup
│   ├── redis.js                  # Redis setup
│   └── constants.js              # App constants
├── models/                       # Database schemas
├── controllers/                  # Business logic
├── routes/                       # API routes
├── middleware/                   # Custom middleware
├── socket/socketHandler.js       # Socket.IO events
└── public/test-client.html       # Test UI
```

## 🔑 Important Constants

```javascript
// From config/constants.js
JWT_EXPIRE: '30d'
OTP_EXPIRE_MINUTES: 10
MAX_FILE_SIZE: 10MB
DEFAULT_SEARCH_RADIUS: 5000m (5km)
MAX_GROUP_MEMBERS: 256
MAX_MESSAGE_LENGTH: 5000
RATE_LIMIT: 100 requests/15min
```

## 🐛 Common Issues & Solutions

### MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Start MongoDB
sudo systemctl start mongodb
```

### Redis Connection Error
```bash
# Check if Redis is running
sudo systemctl status redis

# Start Redis
sudo systemctl start redis
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 PID
```

### JWT Token Expired
- Login again to get a new token
- Tokens expire after 30 days by default

## 📊 Database Collections

```
MongoDB Collections:
- users          # User accounts and profiles
- otps           # OTP verification codes
- chats          # Private and group chats
- messages       # Chat messages
```

## 🔐 Security Checklist

- ✅ Change JWT_SECRET in production
- ✅ Use strong passwords
- ✅ Enable HTTPS in production
- ✅ Configure CORS properly
- ✅ Set up MongoDB authentication
- ✅ Set up Redis password
- ✅ Use environment variables
- ✅ Enable rate limiting

## 📱 Socket.IO Events Reference

### Emit (Client → Server)
- `chat:join` - Join a chat room
- `chat:leave` - Leave a chat room
- `message:send` - Send a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `message:read` - Mark message as read
- `message:delivered` - Mark message as delivered
- `location:update` - Update location
- `nearby:request` - Get nearby users

### Listen (Server → Client)
- `message:new` - New message received
- `typing:user` - User typing status
- `message:read` - Message read receipt
- `message:delivered` - Message delivered
- `user:online` - User came online
- `user:offline` - User went offline
- `nearby:users` - Nearby users list
- `error` - Error occurred

## 🎯 Testing Workflow

1. **Register** a user → Get token
2. **Login** with credentials → Get token
3. **Update location** with lat/long
4. **Find nearby users** within radius
5. **Create private chat** with a user
6. **Connect Socket.IO** with token
7. **Join chat** room
8. **Send messages** in real-time
9. **Test typing** indicators
10. **Check read receipts**

## 💡 Pro Tips

- Use the test client for quick testing
- Import Postman collection for API testing
- Check server logs for debugging
- Use Redis CLI to inspect cache: `redis-cli`
- Use MongoDB Compass for database inspection
- Enable nodemon for auto-reload in development
- Use PM2 for production deployment

## 📞 Support

For issues or questions:
1. Check the README.md
2. Check PROJECT_SUMMARY.md
3. Review the code comments
4. Check server logs
5. Test with the test client

---

**Happy Coding! 🚀**
