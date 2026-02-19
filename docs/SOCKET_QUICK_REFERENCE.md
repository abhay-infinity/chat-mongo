# Socket.IO Quick Reference

## Connection
```javascript
import io from 'socket.io-client';

const socket = io('https://your-api.com', {
  auth: { token: 'your-jwt-token' }
});
```

## Event Syntax
```javascript
// Emit with callback
socket.emit('event:name', { data }, (response) => {
  if (response.success) {
    // Handle success
  }
});

// Listen for events
socket.on('event:name', (data) => {
  // Handle event
});
```

## All Events

### Chat Operations
| Event | Purpose | Data | Response |
|-------|---------|------|----------|
| `chats:getAll` | Get all chats | `{ page, limit }` | `{ chats, pagination }` |
| `chat:getById` | Get single chat | `{ chatId }` | `{ chat }` |
| `chat:createPrivate` | Create/get private chat | `{ userId }` | `{ chat }` |
| `chat:delete` | Delete chat | `{ chatId }` | `{ success }` |
| `chat:toggleMute` | Mute/unmute chat | `{ chatId, mute }` | `{ success }` |
| `chat:clearUnread` | Clear unread count | `{ chatId }` | `{ success }` |
| `chat:join` | Join chat room | `{ chatId }` | `{ success }` |
| `chat:leave` | Leave chat room | `{ chatId }` | `{ success }` |
| `chat:extend` | Extend random chat | `{ chatId, hours }` | `{ expiresAt }` |

### Message Operations
| Event | Purpose | Data | Response |
|-------|---------|------|----------|
| `messages:get` | Get messages | `{ chatId, page, limit }` | `{ messages, pagination }` |
| `message:send` | Send message | `{ chatId, content, type }` | `{ message }` |
| `message:delete` | Delete message | `{ messageId, chatId }` | `{ success }` |
| `message:read` | Mark as read | `{ messageId, chatId }` | `{ success }` |
| `message:delivered` | Mark as delivered | `{ messageId, chatId }` | `{ success }` |

### Typing Indicators
| Event | Purpose | Data |
|-------|---------|------|
| `typing:start` | Start typing | `{ chatId }` |
| `typing:stop` | Stop typing | `{ chatId }` |

### Random Chat Pool
| Event | Purpose | Data | Response |
|-------|---------|------|----------|
| `pool:initiateSend` | Create request | `{ message, preferences }` | `{ chat/poolEntry }` |
| `pool:getActive` | Get available requests | `{}` | `{ poolEntries }` |
| `pool:acceptSend` | Accept request | `{ poolId }` | `{ chat }` |

### User Operations
| Event | Purpose | Data | Response |
|-------|---------|------|----------|
| `location:update` | Update location | `{ latitude, longitude }` | `{ success }` |
| `users:search` | Search users | `{ query }` | `{ users }` |
| `users:nearby` | Get nearby users | `{ latitude, longitude, radius }` | `{ users }` |

### Broadcast Events (Listen Only)
| Event | When Fired | Data |
|-------|------------|------|
| `message:new` | New message in chat | `{ message, chatId }` |
| `chat:deleted` | Chat deleted | `{ chatId }` |
| `chat:new` | New chat created | `{ chat }` |
| `chat:matched` | Random chat matched | `{ chat }` |
| `chat:extended` | Chat duration extended | `{ chatId, expiresAt, hours }` |
| `message:deleted` | Message deleted | `{ messageId, chatId }` |
| `message:read` | Message read | `{ messageId, userId, readAt }` |
| `message:delivered` | Message delivered | `{ messageId, userId, deliveredAt }` |
| `typing:user` | User typing status | `{ chatId, userId, username, isTyping }` |
| `user:online` | User came online | `{ userId, username, timestamp }` |
| `user:offline` | User went offline | `{ userId, username, lastSeen }` |

## Common Patterns

### Send Message
```javascript
socket.emit('message:send', {
  chatId: 'chat123',
  content: 'Hello!',
  type: 'text'
}, (response) => {
  if (response.success) {
    console.log('Sent:', response.data.message);
  }
});
```

### Listen for New Messages
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
  // Update UI
});
```

### Typing Indicator
```javascript
// Start typing
socket.emit('typing:start', { chatId });

// Stop after 3 seconds
setTimeout(() => {
  socket.emit('typing:stop', { chatId });
}, 3000);

// Listen
socket.on('typing:user', (data) => {
  if (data.isTyping) {
    console.log(`${data.username} is typing...`);
  }
});
```

### Load Chats
```javascript
socket.emit('chats:getAll', { page: 1, limit: 20 }, (response) => {
  if (response.success) {
    console.log('Chats:', response.data.chats);
  }
});
```

### Create Chat
```javascript
socket.emit('chat:createPrivate', { userId: 'user456' }, (response) => {
  if (response.success) {
    console.log('Chat:', response.data.chat);
  }
});
```

### Random Chat
```javascript
// Initiate
socket.emit('pool:initiateSend', {
  message: 'Hey!',
  preferences: { gender: 'any' }
}, (response) => {
  if (response.data.isMatched) {
    console.log('Matched!', response.data.chat);
  }
});

// Listen for match
socket.on('chat:matched', (data) => {
  console.log('You got matched!', data.chat);
});
```

## Error Handling
```javascript
socket.on('error', (error) => {
  console.error('Error:', error.message);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

## Cleanup
```javascript
useEffect(() => {
  socket.on('message:new', handleMessage);
  
  return () => {
    socket.off('message:new', handleMessage);
  };
}, []);
```
