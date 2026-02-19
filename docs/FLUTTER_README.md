# 📱 Flutter Socket.IO Integration - Complete Documentation

## 🎉 Overview

Complete Socket.IO integration guide for Flutter developers working on the Nearby Chat application.

---

## 📚 Documentation Files

### 1. **[FLUTTER_SOCKET_GUIDE.md](./FLUTTER_SOCKET_GUIDE.md)** ⭐ START HERE
**Complete step-by-step guide** from setup to implementation

**Contents:**
- ✅ Setup & Installation
- ✅ Project Structure
- ✅ Authentication Flow (Login → Token → Socket)
- ✅ Socket Connection Setup
- ✅ Chat Features (Get, Create, Delete, Mute)
- ✅ Message Features (Send, Receive, Delete, Read Receipts)
- ✅ Real-time Features (Typing, Presence, Search)
- ✅ Complete Code Examples
- ✅ Best Practices
- ✅ Troubleshooting

**Perfect for:** Learning the complete flow

---

### 2. **[FLUTTER_QUICK_REFERENCE.md](./FLUTTER_QUICK_REFERENCE.md)** 📋 QUICK LOOKUP
**Quick reference card** for all socket events

**Contents:**
- ✅ All Socket Events (Copy-paste ready)
- ✅ Common Patterns
- ✅ Response Formats
- ✅ Important Notes
- ✅ Debugging Tips
- ✅ Checklist

**Perfect for:** Quick lookups during development

---

## 🚀 Quick Start

### 1. Install Package
```yaml
dependencies:
  socket_io_client: ^2.0.3+1
```

### 2. Login & Get Token
```dart
final result = await authService.login(email, password);
final token = result['token'];
```

### 3. Connect Socket
```dart
final socket = IO.io('https://your-api.com',
  IO.OptionBuilder().setAuth({'token': token}).build()
);
```

### 4. Use Socket Events
```dart
// Get chats
socket.emitWithAck('chats:getAll', {'page': 1}, (response) {
  final chats = response['data']['chats'];
});

// Send message
socket.emitWithAck('message:send', {
  'chatId': chatId,
  'content': 'Hello!',
  'type': 'text'
}, (response) {
  print('Message sent!');
});

// Listen for new messages
socket.on('message:new', (data) {
  final message = data['message'];
  // Update UI
});
```

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter App                          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 1. Login
                         ▼
┌─────────────────────────────────────────────────────────┐
│              POST /api/v1/auth/login                    │
│              { email, password }                        │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 2. Get Token
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Save Token Locally                         │
│              SharedPreferences                          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 3. Connect Socket
                         ▼
┌─────────────────────────────────────────────────────────┐
│              IO.io(url, auth: { token })                │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 4. Socket Connected ✅
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Load Chats                                 │
│              socket.emit('chats:getAll')                │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 5. User Clicks Chat
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Join Chat Room                             │
│              socket.emit('chat:join', {chatId})         │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 6. Load Messages
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Get Messages                               │
│              socket.emit('messages:get', {chatId})      │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 7. Listen for Updates
                         ▼
┌─────────────────────────────────────────────────────────┐
│              socket.on('message:new', ...)              │
│              socket.on('typing:user', ...)              │
│              socket.on('user:online', ...)              │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 8. Send Message
                         ▼
┌─────────────────────────────────────────────────────────┐
│              socket.emit('message:send', {              │
│                chatId, content, type                    │
│              })                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 9. Real-time Broadcast
                         ▼
┌─────────────────────────────────────────────────────────┐
│              All users in chat receive                  │
│              'message:new' event instantly              │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 All Socket Events

### Chat Operations
| Event | Purpose | Data | Response |
|-------|---------|------|----------|
| `chats:getAll` | Get all chats | `{page, limit}` | `{chats, pagination}` |
| `chat:createPrivate` | Create private chat | `{userId}` | `{chat}` |
| `chat:join` | Join chat room | `{chatId}` | `{success}` |
| `chat:leave` | Leave chat room | `{chatId}` | `{success}` |
| `chat:delete` | Delete chat | `{chatId}` | `{success}` |
| `chat:toggleMute` | Mute/unmute | `{chatId, mute}` | `{success}` |

### Message Operations
| Event | Purpose | Data | Response |
|-------|---------|------|----------|
| `messages:get` | Get messages | `{chatId, page, limit}` | `{messages, pagination}` |
| `message:send` | Send message | `{chatId, content, type}` | `{message}` |
| `message:delete` | Delete message | `{messageId, chatId}` | `{success}` |
| `message:read` | Mark as read | `{messageId, chatId}` | `{success}` |

### Real-time Events (Listen Only)
| Event | When Fired | Data |
|-------|------------|------|
| `message:new` | New message in chat | `{message, chatId}` |
| `typing:user` | User typing status | `{chatId, userId, username, isTyping}` |
| `user:online` | User came online | `{userId, username, timestamp}` |
| `user:offline` | User went offline | `{userId, username, lastSeen}` |
| `chat:new` | New chat created | `{chat}` |
| `chat:deleted` | Chat deleted | `{chatId}` |

---

## 💡 Key Concepts

### 1. Authentication Flow
```
Login → Get Token → Save Token → Connect Socket with Token
```

### 2. Chat Room Pattern
```
Join Room → Load Messages → Listen for Updates → Send Messages → Leave Room
```

### 3. Real-time Updates
```
Server broadcasts events → All connected clients receive → Update UI
```

### 4. Typing Indicators
```
User types → Emit typing:start → Auto-stop after 3s → Emit typing:stop
```

---

## ✅ Implementation Checklist

### Setup Phase
- [ ] Add `socket_io_client` dependency
- [ ] Create API config with server URL
- [ ] Create models (User, Chat, Message)
- [ ] Create SocketService singleton

### Authentication Phase
- [ ] Implement login API call
- [ ] Save token to SharedPreferences
- [ ] Connect socket with token
- [ ] Handle connection errors

### Chat List Phase
- [ ] Emit `chats:getAll` to load chats
- [ ] Display chats in ListView
- [ ] Listen for `chat:new` event
- [ ] Listen for `message:new` to update last message
- [ ] Show online/offline status

### Chat Room Phase
- [ ] Emit `chat:join` when entering room
- [ ] Emit `messages:get` to load history
- [ ] Listen for `message:new` event
- [ ] Implement send message functionality
- [ ] Implement typing indicators
- [ ] Emit `chat:leave` when exiting
- [ ] Clean up listeners in dispose()

### Real-time Features
- [ ] Listen for `user:online` event
- [ ] Listen for `user:offline` event
- [ ] Listen for `typing:user` event
- [ ] Implement read receipts
- [ ] Handle reconnection

### Error Handling
- [ ] Check socket connection before emitting
- [ ] Handle connection errors
- [ ] Handle timeout errors
- [ ] Show user-friendly error messages
- [ ] Implement retry logic

---

## 🔧 Common Issues & Solutions

### Issue: Socket not connecting
**Solution:**
```dart
// Check token is valid
final token = await SharedPreferences.getInstance()
    .then((prefs) => prefs.getString('auth_token'));
print('Token: $token');

// Check server URL
print('Connecting to: ${ApiConfig.socketUrl}');

// Listen for errors
socket.onConnectError((error) {
  print('Connection error: $error');
});
```

### Issue: Messages not appearing
**Solution:**
```dart
// Make sure you joined the chat room first
await socket.emitWithAck('chat:join', {'chatId': chatId}, (_) {});

// Then load messages
await socket.emitWithAck('messages:get', {'chatId': chatId}, (response) {
  print('Messages loaded: ${response['data']['messages'].length}');
});

// Make sure listener is set up
socket.on('message:new', (data) {
  print('New message: ${data['message']}');
});
```

### Issue: Duplicate messages
**Solution:**
```dart
// Remove old listeners before adding new ones
@override
void dispose() {
  socket.off('message:new');
  socket.off('typing:user');
  super.dispose();
}
```

---

## 📖 Example: Complete Chat Screen

See **[FLUTTER_SOCKET_GUIDE.md](./FLUTTER_SOCKET_GUIDE.md)** for complete code examples including:

- ✅ Login Screen with Socket Connection
- ✅ Chat List Screen with Real-time Updates
- ✅ Chat Room Screen with Messaging
- ✅ Typing Indicators
- ✅ User Presence
- ✅ Error Handling

---

## 🎓 Best Practices

### 1. Use Singleton for SocketService
```dart
class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();
  
  IO.Socket? _socket;
  // ...
}
```

### 2. Always Use Callbacks
```dart
// ✅ Good
socket.emitWithAck('message:send', data, (response) {
  if (response['success']) {
    // Handle success
  }
});

// ❌ Bad
socket.emit('message:send', data); // No confirmation
```

### 3. Clean Up Listeners
```dart
@override
void dispose() {
  socket.off('message:new');
  socket.off('typing:user');
  super.dispose();
}
```

### 4. Handle Reconnection
```dart
socket.onConnect((_) {
  // Rejoin all active chats
  for (var chatId in activeChats) {
    socket.emit('chat:join', {'chatId': chatId});
  }
});
```

---

## 🚀 Performance Tips

1. **Cache Messages Locally** - Use SQLite or Hive
2. **Paginate Message Loading** - Load 50 messages at a time
3. **Debounce Typing Indicators** - Don't emit on every keystroke
4. **Lazy Load Chats** - Load more as user scrolls
5. **Optimize Images** - Compress before sending

---

## 📞 Support

### Documentation
- **Complete Guide**: [FLUTTER_SOCKET_GUIDE.md](./FLUTTER_SOCKET_GUIDE.md)
- **Quick Reference**: [FLUTTER_QUICK_REFERENCE.md](./FLUTTER_QUICK_REFERENCE.md)

### Server Documentation
- **Socket Events**: [SOCKET_QUICK_REFERENCE.md](./SOCKET_QUICK_REFERENCE.md)
- **Architecture**: [SOCKET_MODULAR_ARCHITECTURE.md](./SOCKET_MODULAR_ARCHITECTURE.md)

---

## ✨ Summary

**What You Have:**
- ✅ Complete Flutter integration guide
- ✅ Step-by-step implementation
- ✅ All socket events documented
- ✅ Complete code examples
- ✅ Best practices
- ✅ Troubleshooting guide

**What You Can Build:**
- ✅ Real-time chat application
- ✅ Typing indicators
- ✅ User presence tracking
- ✅ Read receipts
- ✅ Message delivery status
- ✅ Search and nearby users

**Ready to build!** 🚀

---

Made with ❤️ for Flutter Developers
