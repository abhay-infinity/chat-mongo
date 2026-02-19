# 🌍 Nearby Chat - Real-time Location-Based Chat Application

A complete real-time chat application built with **Node.js**, **Express**, **Socket.IO**, **MongoDB**, and **Redis**. Features include location-based user discovery, private & group chats, real-time messaging, typing indicators, read receipts, and more.

## ✨ Features

### 🔐 Authentication
- User registration with email/phone verification
- Login with email, phone, or username
- OTP-based verification
- JWT token authentication
- Secure password hashing with bcrypt

### 💬 Real-time Messaging
- Private one-on-one chats
- Group chats (up to 256 members)
- Text, image, video, and location sharing
- Message read receipts
- Message delivery status
- Typing indicators
- Reply to messages
- Delete messages (for self or everyone)

### 📍 Location Features
- Update user location
- Find nearby users within radius
- Location-based user discovery
- Geospatial queries with MongoDB
- Redis caching for fast location lookups

### 👥 User Management
- User profiles with avatars
- Bio and status
- Online/offline status
- Last seen timestamp
- Block/unblock users
- Privacy settings

### 🔔 Real-time Features
- Socket.IO for instant messaging
- Online presence tracking
- Typing indicators
- Read receipts
- Push notifications (ready for integration)

### 🎯 Group Chat Features
- Create groups
- Add/remove members
- Group admin controls
- Group avatars
- Leave group
- Transfer admin rights

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Database**: MongoDB (with Mongoose)
- **Cache**: Redis (ioredis)
- **Authentication**: JWT, bcryptjs
- **File Upload**: Multer, Sharp
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 📁 Project Structure

```
nearby-chat/
├── config/
│   ├── database.js          # MongoDB connection
│   ├── redis.js             # Redis connection & helpers
│   └── constants.js         # App constants
├── controllers/
│   ├── auth.controller.js   # Authentication logic
│   ├── user.controller.js   # User management
│   ├── chat.controller.js   # Chat operations
│   ├── message.controller.js # Message handling
│   └── group.controller.js  # Group management
├── models/
│   ├── User.model.js        # User schema
│   ├── OTP.model.js         # OTP schema
│   ├── Chat.model.js        # Chat schema
│   └── Message.model.js     # Message schema
├── routes/
│   ├── auth.routes.js       # Auth endpoints
│   ├── user.routes.js       # User endpoints
│   ├── chat.routes.js       # Chat endpoints
│   ├── message.routes.js    # Message endpoints
│   └── group.routes.js      # Group endpoints
├── middleware/
│   ├── auth.middleware.js   # JWT verification
│   ├── upload.middleware.js # File upload handling
│   └── validate.middleware.js # Input validation
├── socket/
│   └── socketHandler.js     # Socket.IO events
├── uploads/                 # Uploaded files
├── public/
│   └── test-client.html     # Test client
├── server.js                # Main server file
├── package.json
└── .env.example
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)

### Installation

1. **Clone the repository**
   ```bash
   cd /home/abhi/Documents/Project/working/near-by-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - MongoDB URI
   - Redis connection
   - JWT secret
   - Other settings

4. **Start MongoDB** (if not running)
   ```bash
   sudo systemctl start mongodb
   # or
   mongod
   ```

5. **Start Redis** (if not running)
   ```bash
   sudo systemctl start redis
   # or
   redis-server
   ```

6. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Access the test client**
   Open your browser and navigate to:
   ```
   http://localhost:5000/test-client.html
   ```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /send-otp` - Send OTP
- `POST /verify-otp` - Verify OTP
- `GET /me` - Get current user (protected)
- `POST /logout` - Logout (protected)

### Users (`/api/users`)
- `GET /profile/:userId` - Get user profile
- `PUT /profile` - Update profile
- `PUT /location` - Update location
- `GET /nearby` - Get nearby users
- `GET /search` - Search users
- `PUT /settings` - Update settings
- `POST /block/:userId` - Block user
- `DELETE /block/:userId` - Unblock user
- `POST /avatar` - Upload avatar

### Chats (`/api/chats`)
- `GET /` - Get all chats
- `GET /:chatId` - Get chat by ID
- `POST /private/:userId` - Create/get private chat
- `DELETE /:chatId` - Delete chat
- `PUT /:chatId/mute` - Mute/unmute chat
- `PUT /:chatId/clear-unread` - Clear unread count

### Messages (`/api/messages`)
- `GET /:chatId` - Get messages
- `POST /` - Send message
- `POST /upload` - Upload media
- `DELETE /:messageId` - Delete message
- `PUT /:chatId/read` - Mark as read

### Groups (`/api/groups`)
- `POST /` - Create group
- `PUT /:groupId` - Update group
- `POST /:groupId/members` - Add members
- `DELETE /:groupId/members/:userId` - Remove member
- `POST /:groupId/leave` - Leave group
- `POST /:groupId/avatar` - Upload group avatar

## 🔌 Socket.IO Events

### Client → Server
- `chat:join` - Join a chat room
- `chat:leave` - Leave a chat room
- `message:send` - Send a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `message:read` - Mark message as read
- `message:delivered` - Mark message as delivered
- `location:update` - Update location
- `nearby:request` - Request nearby users

### Server → Client
- `message:new` - New message received
- `typing:user` - User typing status
- `message:read` - Message read receipt
- `message:delivered` - Message delivered receipt
- `user:online` - User came online
- `user:offline` - User went offline
- `nearby:users` - Nearby users list
- `error` - Error occurred

## 🧪 Testing

1. Open the test client: `http://localhost:5000/test-client.html`
2. Register a new user or login
3. Update your location
4. Find nearby users
5. Create a chat and send messages
6. Test real-time features in multiple browser tabs

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Helmet.js for security headers
- CORS protection
- Input validation
- File upload restrictions

## 🎯 Redis Usage

Redis is used for:
- User online/offline status
- Socket ID mapping
- Location caching (geospatial queries)
- Typing indicators
- General caching

## 📊 MongoDB Indexes

Optimized indexes for:
- Geospatial queries (location-based search)
- User lookups (username, email, phone)
- Chat queries (participants, type)
- Message queries (chat, timestamp)

## 🚀 Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name nearby-chat
pm2 save
pm2 startup
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
nearbychat_MONGODB_URI=your_production_mongodb_uri
REDIS_HOST=your_redis_host
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_strong_secret_key
```

## 📝 TODO / Future Enhancements

- [ ] Push notifications (FCM/APNs)
- [ ] Email service integration
- [ ] SMS service integration
- [ ] Voice/Video calling
- [ ] Message encryption
- [ ] Cloud storage for media (AWS S3)
- [ ] Message search
- [ ] User stories/status
- [ ] Message reactions
- [ ] Forward messages
- [ ] Broadcast messages

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Built with ❤️ for real-time communication

---

**Happy Chatting! 🎉**
