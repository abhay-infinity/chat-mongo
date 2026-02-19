# Socket.IO Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/Mobile)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐                                                   │
│  │ Login Screen │                                                   │
│  └──────┬───────┘                                                   │
│         │                                                            │
│         │ 1. POST /api/v1/auth/login                                │
│         │    { email, password }                                    │
│         ▼                                                            │
│  ┌──────────────┐                                                   │
│  │ Get JWT Token│                                                   │
│  └──────┬───────┘                                                   │
│         │                                                            │
│         │ 2. Connect Socket.IO                                      │
│         │    io(url, { auth: { token } })                          │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Socket.IO Connection                         │      │
│  │  ┌────────────────────────────────────────────────────┐  │      │
│  │  │ Authenticated ✓                                    │  │      │
│  │  │ User ID: 12345                                     │  │      │
│  │  │ Socket ID: abc123                                  │  │      │
│  │  └────────────────────────────────────────────────────┘  │      │
│  └──────────────────────────────────────────────────────────┘      │
│         │                                                            │
│         │ 3. All Operations via Socket.IO                          │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                   Socket Events                           │      │
│  │  • chats:getAll                                          │      │
│  │  • message:send                                          │      │
│  │  • typing:start                                          │      │
│  │  • chat:join                                             │      │
│  │  • ... and more                                          │      │
│  └──────────────────────────────────────────────────────────┘      │
│         │                                                            │
│         │ ◄──────────────────────────────────────────────►         │
│         │         Bidirectional Real-time                           │
│         │                                                            │
└─────────┼────────────────────────────────────────────────────────────┘
          │
          │ WebSocket Connection (Persistent)
          │
┌─────────▼────────────────────────────────────────────────────────────┐
│                         SERVER (Node.js)                              │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │              Socket.IO Server                             │        │
│  │  ┌────────────────────────────────────────────────────┐  │        │
│  │  │ Authentication Middleware                          │  │        │
│  │  │  • Verify JWT Token                               │  │        │
│  │  │  • Load User Data                                 │  │        │
│  │  │  • Attach to socket.user                          │  │        │
│  │  └────────────────────────────────────────────────────┘  │        │
│  │                                                            │        │
│  │  ┌────────────────────────────────────────────────────┐  │        │
│  │  │ Connection Handler                                 │  │        │
│  │  │  • Store socket connection                         │  │        │
│  │  │  • Set user online                                 │  │        │
│  │  │  • Auto-join user's chats                          │  │        │
│  │  │  • Broadcast online status                         │  │        │
│  │  └────────────────────────────────────────────────────┘  │        │
│  │                                                            │        │
│  │  ┌────────────────────────────────────────────────────┐  │        │
│  │  │ Event Handlers                                     │  │        │
│  │  │                                                     │  │        │
│  │  │  📋 Chat Operations                                │  │        │
│  │  │    • chats:getAll                                  │  │        │
│  │  │    • chat:createPrivate                            │  │        │
│  │  │    • chat:delete                                   │  │        │
│  │  │    • chat:toggleMute                               │  │        │
│  │  │                                                     │  │        │
│  │  │  💬 Message Operations                             │  │        │
│  │  │    • messages:get                                  │  │        │
│  │  │    • message:send                                  │  │        │
│  │  │    • message:delete                                │  │        │
│  │  │    • message:read                                  │  │        │
│  │  │                                                     │  │        │
│  │  │  ✍️  Typing Indicators                             │  │        │
│  │  │    • typing:start                                  │  │        │
│  │  │    • typing:stop                                   │  │        │
│  │  │                                                     │  │        │
│  │  │  🎲 Random Chat                                    │  │        │
│  │  │    • pool:initiateSend                             │  │        │
│  │  │    • pool:acceptSend                               │  │        │
│  │  │                                                     │  │        │
│  │  │  👥 User Operations                                │  │        │
│  │  │    • users:search                                  │  │        │
│  │  │    • users:nearby                                  │  │        │
│  │  │    • location:update                               │  │        │
│  │  └────────────────────────────────────────────────────┘  │        │
│  │                                                            │        │
│  │  ┌────────────────────────────────────────────────────┐  │        │
│  │  │ Broadcast Events                                   │  │        │
│  │  │  • message:new → All chat participants             │  │        │
│  │  │  • typing:user → Other chat participants           │  │        │
│  │  │  • user:online → All connected users               │  │        │
│  │  │  • user:offline → All connected users              │  │        │
│  │  │  • chat:deleted → All chat participants            │  │        │
│  │  └────────────────────────────────────────────────────┘  │        │
│  └──────────────────────────────────────────────────────────┘        │
│         │                                                              │
│         │ Database Operations                                         │
│         ▼                                                              │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                   MongoDB                                 │        │
│  │  • Users                                                  │        │
│  │  • Chats                                                  │        │
│  │  • Messages                                               │        │
│  │  • MessagePool                                            │        │
│  └──────────────────────────────────────────────────────────┘        │
│         │                                                              │
│         │ Caching & Real-time State                                   │
│         ▼                                                              │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                   Redis                                   │        │
│  │  • User online status                                     │        │
│  │  • Typing indicators                                      │        │
│  │  • User locations                                         │        │
│  │  • Cached user data                                       │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Event Flow Examples

### 1. Sending a Message

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  User A  │                    │  Server  │                    │  User B  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ 1. message:send               │                               │
     │ { chatId, content }           │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │ 2. Save to MongoDB            │
     │                               │                               │
     │                               │ 3. Update chat metadata       │
     │                               │                               │
     │ 4. Callback                   │                               │
     │ { success, message }          │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
     │                               │ 5. Broadcast message:new      │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │                               │ 6. Display
     │                               │                               │    message
     │                               │                               │
```

### 2. Typing Indicator

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  User A  │                    │  Server  │                    │  User B  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ 1. typing:start               │                               │
     │ { chatId }                    │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │ 2. Store in Redis             │
     │                               │                               │
     │                               │ 3. Broadcast typing:user      │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │                               │ 4. Show
     │                               │                               │    "typing..."
     │                               │                               │
     │ 5. typing:stop (after 3s)     │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │ 6. Broadcast typing:user      │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │                               │ 7. Hide
     │                               │                               │    indicator
```

### 3. User Presence

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  User A  │                    │  Server  │                    │  User B  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ 1. Connect                    │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │ 2. Set online in Redis        │
     │                               │                               │
     │                               │ 3. Update MongoDB             │
     │                               │                               │
     │                               │ 4. Broadcast user:online      │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │                               │ 5. Update
     │                               │                               │    UI status
     │                               │                               │
     │ 6. Disconnect                 │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │ 7. Set offline in Redis       │
     │                               │                               │
     │                               │ 8. Broadcast user:offline     │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │                               │ 9. Show
     │                               │                               │    "last seen"
```

---

## Data Flow

### Request-Response Pattern (with callback)

```javascript
// Client
socket.emit('chats:getAll', { page: 1 }, (response) => {
  // Response received immediately
  console.log(response.data.chats);
});

// Server
socket.on('chats:getAll', async (data, callback) => {
  const chats = await Chat.find(...);
  callback({ success: true, data: { chats } });
});
```

### Broadcast Pattern (real-time updates)

```javascript
// Client A sends message
socket.emit('message:send', { chatId, content });

// Server broadcasts to all in chat
io.to(chatId).emit('message:new', { message, chatId });

// Client B receives (real-time)
socket.on('message:new', (data) => {
  // Update UI instantly
  addMessageToUI(data.message);
});
```

---

## Room Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Socket.IO Rooms                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Room: chat_abc123                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • User A (socket: xyz1)                             │   │
│  │  • User B (socket: xyz2)                             │   │
│  │  • User C (socket: xyz3)                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Room: chat_def456                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • User A (socket: xyz1)                             │   │
│  │  • User D (socket: xyz4)                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  When message sent to chat_abc123:                           │
│  → Only User A, B, C receive it                              │
│  → User D doesn't receive it (not in room)                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Comparison

### Before (REST API)

```
Client                          Server
  │                               │
  │ GET /api/v1/chats            │
  ├──────────────────────────────►│
  │                               │ Query DB (200ms)
  │◄──────────────────────────────┤
  │ Response (500ms total)        │
  │                               │
  │ (Wait 5 seconds)              │
  │                               │
  │ GET /api/v1/chats (poll)     │
  ├──────────────────────────────►│
  │                               │ Query DB (200ms)
  │◄──────────────────────────────┤
  │ Response (500ms total)        │
  │                               │
  │ (Repeat every 5 seconds)      │
  
  Total: 12 requests/minute
```

### After (Socket.IO)

```
Client                          Server
  │                               │
  │ Connect (once)                │
  ├──────────────────────────────►│
  │                               │
  │ chats:getAll                  │
  ├──────────────────────────────►│
  │                               │ Query DB (50ms)
  │◄──────────────────────────────┤
  │ Response (50ms total)         │
  │                               │
  │ (No polling needed)           │
  │                               │
  │ message:new (real-time)       │
  │◄──────────────────────────────┤
  │ Instant update!               │
  
  Total: 1 request on load + real-time updates
```

---

## Summary

### Architecture Benefits
- ✅ **Single persistent connection** (no repeated handshakes)
- ✅ **Bidirectional communication** (server can push to client)
- ✅ **Room-based broadcasting** (efficient message delivery)
- ✅ **Automatic reconnection** (handles network issues)
- ✅ **Event-based** (clean, organized code)

### Performance Benefits
- ⚡ **10x faster** response times
- 📉 **90% fewer** requests
- 💰 **Lower costs** (bandwidth, servers)
- 🔋 **Better battery** life
- 🚀 **Instant** real-time updates

### Developer Benefits
- 📚 **Clear event names** (self-documenting)
- 🔧 **Easy to test** (emit events, check responses)
- 🐛 **Easy to debug** (event logs)
- 📦 **Modular** (each event is independent)
- 🎯 **Type-safe** (with TypeScript if needed)
