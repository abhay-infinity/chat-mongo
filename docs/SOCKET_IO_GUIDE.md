# Socket.IO Complete Integration Guide

## Overview
This application uses a **Socket.IO-first architecture** where all real-time operations (chats, messages, typing indicators, user presence) are handled via WebSocket connections instead of REST API calls. This significantly reduces latency and server load.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Connection Setup](#connection-setup)
3. [Event Reference](#event-reference)
4. [Frontend Integration Examples](#frontend-integration-examples)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## Authentication

### Step 1: Get Authentication Token
First, authenticate via REST API to get a JWT token:

```javascript
// POST /api/v1/auth/login or /api/v1/auth/register
const response = await fetch('https://your-api.com/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'user@example.com',
    password: 'password123'
  })
});

const { token } = await response.json();
```

### Step 2: Connect to Socket.IO with Token
Use the token to establish a WebSocket connection:

```javascript
import io from 'socket.io-client';

const socket = io('https://your-api.com', {
  auth: {
    token: token  // Pass the JWT token here
  }
});
```

---

## Connection Setup

### Basic Connection (React Example)

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Get token from localStorage or state management
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    // Initialize socket connection
    const newSocket = io('https://your-api.com', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div>
      <h1>Chat App</h1>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      {/* Your app components */}
    </div>
  );
}
```

### Connection with React Context (Recommended)

```javascript
// SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, token }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.REACT_APP_API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
```

---

## Event Reference

### 📋 Chat Operations

#### 1. Get All Chats
**Event:** `chats:getAll`

```javascript
socket.emit('chats:getAll', { page: 1, limit: 20 }, (response) => {
  if (response.success) {
    console.log('Chats:', response.data.chats);
    console.log('Pagination:', response.data.pagination);
  } else {
    console.error('Error:', response.message);
  }
});
```

**Response:**
```javascript
{
  success: true,
  data: {
    chats: [
      {
        _id: "chat123",
        type: "private",
        participants: [...],
        lastMessage: {...},
        unreadCount: Map,
        createdAt: "2024-01-01T00:00:00.000Z"
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 45,
      pages: 3
    }
  }
}
```

#### 2. Get Chat by ID
**Event:** `chat:getById`

```javascript
socket.emit('chat:getById', { chatId: 'chat123' }, (response) => {
  if (response.success) {
    console.log('Chat:', response.data.chat);
  }
});
```

#### 3. Create Private Chat
**Event:** `chat:createPrivate`

```javascript
socket.emit('chat:createPrivate', { userId: 'user456' }, (response) => {
  if (response.success) {
    console.log('Chat created:', response.data.chat);
  }
});
```

#### 4. Delete Chat
**Event:** `chat:delete`

```javascript
socket.emit('chat:delete', { chatId: 'chat123' }, (response) => {
  if (response.success) {
    console.log('Chat deleted successfully');
  }
});
```

**Listen for deletion:**
```javascript
socket.on('chat:deleted', (data) => {
  console.log('Chat deleted:', data.chatId);
  // Remove chat from UI
});
```

#### 5. Mute/Unmute Chat
**Event:** `chat:toggleMute`

```javascript
socket.emit('chat:toggleMute', 
  { chatId: 'chat123', mute: true }, 
  (response) => {
    if (response.success) {
      console.log(response.message); // "Chat muted"
    }
  }
);
```

#### 6. Clear Unread Count
**Event:** `chat:clearUnread`

```javascript
socket.emit('chat:clearUnread', { chatId: 'chat123' }, (response) => {
  if (response.success) {
    console.log('Unread count cleared');
  }
});
```

#### 7. Join Chat Room
**Event:** `chat:join`

```javascript
socket.emit('chat:join', { chatId: 'chat123' }, (response) => {
  if (response.success) {
    console.log('Joined chat room');
  }
});
```

#### 8. Leave Chat Room
**Event:** `chat:leave`

```javascript
socket.emit('chat:leave', { chatId: 'chat123' }, (response) => {
  console.log('Left chat room');
});
```

---

### 💬 Message Operations

#### 1. Get Messages
**Event:** `messages:get`

```javascript
socket.emit('messages:get', 
  { chatId: 'chat123', page: 1, limit: 50 }, 
  (response) => {
    if (response.success) {
      console.log('Messages:', response.data.messages);
    }
  }
);
```

#### 2. Send Message
**Event:** `message:send`

```javascript
socket.emit('message:send', {
  chatId: 'chat123',
  content: 'Hello, how are you?',
  type: 'text'  // 'text', 'image', 'video', 'audio', 'file', 'location'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.data.message);
  }
});
```

**Listen for new messages:**
```javascript
socket.on('message:new', (data) => {
  console.log('New message received:', data.message);
  console.log('In chat:', data.chatId);
  // Add message to UI
});
```

#### 3. Send Message with Reply
```javascript
socket.emit('message:send', {
  chatId: 'chat123',
  content: 'I agree!',
  type: 'text',
  replyTo: 'message456'  // ID of message being replied to
}, (response) => {
  if (response.success) {
    console.log('Reply sent');
  }
});
```

#### 4. Send Image Message
```javascript
socket.emit('message:send', {
  chatId: 'chat123',
  content: 'Check this out!',
  type: 'image',
  media: {
    url: 'https://example.com/image.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    size: 1024000,
    mimeType: 'image/jpeg'
  }
}, (response) => {
  if (response.success) {
    console.log('Image sent');
  }
});
```

#### 5. Delete Message
**Event:** `message:delete`

```javascript
socket.emit('message:delete', 
  { messageId: 'msg123', chatId: 'chat123' }, 
  (response) => {
    if (response.success) {
      console.log('Message deleted');
    }
  }
);
```

**Listen for deletions:**
```javascript
socket.on('message:deleted', (data) => {
  console.log('Message deleted:', data.messageId);
  // Update UI
});
```

#### 6. Mark Message as Read
**Event:** `message:read`

```javascript
socket.emit('message:read', {
  messageId: 'msg123',
  chatId: 'chat123'
}, (response) => {
  if (response.success) {
    console.log('Marked as read');
  }
});
```

**Listen for read receipts:**
```javascript
socket.on('message:read', (data) => {
  console.log(`Message ${data.messageId} read by ${data.userId}`);
  // Update double checkmarks to blue
});
```

#### 7. Mark Message as Delivered
**Event:** `message:delivered`

```javascript
socket.emit('message:delivered', {
  messageId: 'msg123',
  chatId: 'chat123'
});
```

**Listen for delivery receipts:**
```javascript
socket.on('message:delivered', (data) => {
  console.log(`Message ${data.messageId} delivered to ${data.userId}`);
  // Update single checkmark to double
});
```

---

### ✍️ Typing Indicators

#### Start Typing
```javascript
socket.emit('typing:start', { chatId: 'chat123' });
```

#### Stop Typing
```javascript
socket.emit('typing:stop', { chatId: 'chat123' });
```

#### Listen for Typing
```javascript
socket.on('typing:user', (data) => {
  if (data.isTyping) {
    console.log(`${data.username} is typing...`);
    // Show typing indicator
  } else {
    console.log(`${data.username} stopped typing`);
    // Hide typing indicator
  }
});
```

**Example with Auto-Stop:**
```javascript
let typingTimeout;

function handleTyping() {
  // Clear previous timeout
  clearTimeout(typingTimeout);
  
  // Emit typing start
  socket.emit('typing:start', { chatId: currentChatId });
  
  // Auto-stop after 3 seconds of inactivity
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { chatId: currentChatId });
  }, 3000);
}

// Call this on every keystroke
inputField.addEventListener('input', handleTyping);
```

---

### 🎲 Random Chat / Message Pool

#### 1. Initiate Random Chat Request
**Event:** `pool:initiateSend`

```javascript
socket.emit('pool:initiateSend', {
  message: 'Hey! Want to chat?',
  preferences: {
    gender: 'any',  // 'male', 'female', 'other', 'any'
    ageRange: 'any'
  },
  location: {
    type: 'Point',
    coordinates: [72.5714, 23.0225]  // [longitude, latitude]
  }
}, (response) => {
  if (response.success) {
    if (response.data.isMatched) {
      console.log('Matched immediately!', response.data.chat);
      // Navigate to chat
    } else {
      console.log('Added to pool, waiting for match...');
    }
  }
});
```

#### 2. Get Active Pool
**Event:** `pool:getActive`

```javascript
socket.emit('pool:getActive', {}, (response) => {
  if (response.success) {
    console.log('Available requests:', response.data.poolEntries);
  }
});
```

#### 3. Accept Random Chat Request
**Event:** `pool:acceptSend`

```javascript
socket.emit('pool:acceptSend', { poolId: 'pool123' }, (response) => {
  if (response.success) {
    console.log('Chat started!', response.data.chat);
    // Navigate to chat
  }
});
```

#### 4. Listen for Matches
```javascript
socket.on('chat:matched', (data) => {
  console.log('You got matched!', data.chat);
  // Show notification and navigate to chat
});
```

#### 5. Extend Chat Duration
**Event:** `chat:extend`

```javascript
socket.emit('chat:extend', 
  { chatId: 'chat123', hours: 24 },  // 24 or 48 hours
  (response) => {
    if (response.success) {
      console.log('Chat extended until:', response.data.expiresAt);
    }
  }
);
```

**Listen for extensions:**
```javascript
socket.on('chat:extended', (data) => {
  console.log(`Chat extended by ${data.hours} hours`);
  console.log('New expiry:', data.expiresAt);
});
```

---

### 👥 User Operations

#### 1. Update Location
**Event:** `location:update`

```javascript
socket.emit('location:update', {
  latitude: 23.0225,
  longitude: 72.5714,
  address: 'Ahmedabad, Gujarat, India'
}, (response) => {
  if (response.success) {
    console.log('Location updated');
  }
});
```

#### 2. Search Users
**Event:** `users:search`

```javascript
socket.emit('users:search', { query: 'john' }, (response) => {
  if (response.success) {
    console.log('Found users:', response.data.users);
  }
});
```

#### 3. Get Nearby Users
**Event:** `users:nearby`

```javascript
socket.emit('users:nearby', {
  latitude: 23.0225,
  longitude: 72.5714,
  radius: 5000  // in meters
}, (response) => {
  if (response.success) {
    console.log('Nearby users:', response.data.users);
  }
});
```

---

### 🟢 User Presence

#### Listen for Online Status
```javascript
socket.on('user:online', (data) => {
  console.log(`${data.username} came online`);
  // Update user status in UI
});
```

#### Listen for Offline Status
```javascript
socket.on('user:offline', (data) => {
  console.log(`${data.username} went offline`);
  console.log('Last seen:', data.lastSeen);
  // Update user status in UI
});
```

---

## Frontend Integration Examples

### Complete React Chat Component

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';

function ChatRoom({ chatId }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket || !chatId) return;

    // Join chat room
    socket.emit('chat:join', { chatId }, (response) => {
      if (response.success) {
        console.log('Joined chat');
      }
    });

    // Load messages
    socket.emit('messages:get', { chatId, page: 1, limit: 50 }, (response) => {
      if (response.success) {
        setMessages(response.data.messages);
      }
    });

    // Listen for new messages
    socket.on('message:new', (data) => {
      if (data.chatId === chatId) {
        setMessages(prev => [...prev, data.message]);
        
        // Mark as delivered
        socket.emit('message:delivered', {
          messageId: data.message._id,
          chatId: chatId
        });
      }
    });

    // Listen for typing
    socket.on('typing:user', (data) => {
      if (data.chatId === chatId) {
        if (data.isTyping) {
          setTypingUsers(prev => [...new Set([...prev, data.username])]);
        } else {
          setTypingUsers(prev => prev.filter(u => u !== data.username));
        }
      }
    });

    // Cleanup
    return () => {
      socket.emit('chat:leave', { chatId });
      socket.off('message:new');
      socket.off('typing:user');
    };
  }, [socket, chatId]);

  const handleTyping = () => {
    if (!isTyping) {
      socket.emit('typing:start', { chatId });
      setIsTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { chatId });
      setIsTyping(false);
    }, 3000);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    socket.emit('message:send', {
      chatId,
      content: inputText,
      type: 'text'
    }, (response) => {
      if (response.success) {
        setInputText('');
        socket.emit('typing:stop', { chatId });
        setIsTyping(false);
      }
    });
  };

  return (
    <div className="chat-room">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg._id} className="message">
            <strong>{msg.sender.username}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <div className="input-area">
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            handleTyping();
          }}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatRoom;
```

### Chat List Component

```javascript
import React, { useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

function ChatList() {
  const { socket } = useSocket();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Load chats
    socket.emit('chats:getAll', { page: 1, limit: 20 }, (response) => {
      if (response.success) {
        setChats(response.data.chats);
      }
    });

    // Listen for new chats
    socket.on('chat:new', (data) => {
      setChats(prev => [data.chat, ...prev]);
    });

    // Listen for new messages (to update last message)
    socket.on('message:new', (data) => {
      setChats(prev => prev.map(chat => 
        chat._id === data.chatId 
          ? { ...chat, lastMessage: data.message }
          : chat
      ));
    });

    // Listen for deleted chats
    socket.on('chat:deleted', (data) => {
      setChats(prev => prev.filter(chat => chat._id !== data.chatId));
    });

    return () => {
      socket.off('chat:new');
      socket.off('message:new');
      socket.off('chat:deleted');
    };
  }, [socket]);

  const deleteChat = (chatId) => {
    socket.emit('chat:delete', { chatId }, (response) => {
      if (response.success) {
        console.log('Chat deleted');
      }
    });
  };

  const muteChat = (chatId, mute) => {
    socket.emit('chat:toggleMute', { chatId, mute }, (response) => {
      if (response.success) {
        setChats(prev => prev.map(chat => 
          chat._id === chatId 
            ? { ...chat, mutedBy: mute ? [...chat.mutedBy, socket.userId] : [] }
            : chat
        ));
      }
    });
  };

  return (
    <div className="chat-list">
      <h2>Chats</h2>
      {chats.map(chat => (
        <div key={chat._id} className="chat-item">
          <h3>{chat.participants[0].username}</h3>
          <p>{chat.lastMessage?.content || 'No messages yet'}</p>
          <button onClick={() => muteChat(chat._id, true)}>Mute</button>
          <button onClick={() => deleteChat(chat._id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default ChatList;
```

---

## Error Handling

### Global Error Listener

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
  // Show error notification to user
  showNotification(error.message, 'error');
});
```

### Connection Error Handling

```javascript
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication error') {
    // Token expired or invalid
    console.log('Authentication failed, redirecting to login...');
    // Clear token and redirect to login
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  } else {
    console.error('Connection error:', error.message);
  }
});
```

### Callback Error Handling

```javascript
socket.emit('message:send', messageData, (response) => {
  if (!response.success) {
    console.error('Failed to send message:', response.message);
    // Show error to user
    alert(`Error: ${response.message}`);
  }
});
```

---

## Best Practices

### 1. Always Use Callbacks
```javascript
// ✅ Good - with callback
socket.emit('message:send', data, (response) => {
  if (response.success) {
    console.log('Message sent');
  }
});

// ❌ Bad - no callback
socket.emit('message:send', data);
```

### 2. Clean Up Event Listeners
```javascript
useEffect(() => {
  socket.on('message:new', handleNewMessage);
  
  return () => {
    socket.off('message:new', handleNewMessage);
  };
}, []);
```

### 3. Handle Reconnection
```javascript
socket.on('connect', () => {
  console.log('Reconnected, rejoining rooms...');
  
  // Rejoin all active chats
  activeChats.forEach(chatId => {
    socket.emit('chat:join', { chatId });
  });
});
```

### 4. Debounce Typing Indicators
```javascript
const debouncedTyping = debounce(() => {
  socket.emit('typing:start', { chatId });
}, 300);
```

### 5. Optimize Message Loading
```javascript
// Load messages in batches
const loadMoreMessages = () => {
  socket.emit('messages:get', {
    chatId,
    page: currentPage + 1,
    limit: 50
  }, (response) => {
    if (response.success) {
      setMessages(prev => [...response.data.messages, ...prev]);
      setCurrentPage(prev => prev + 1);
    }
  });
};
```

### 6. Handle Offline Mode
```javascript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// Show offline indicator
{!isOnline && <div className="offline-banner">You are offline</div>}
```

---

## Migration from REST API

If you're migrating from REST API to Socket.IO:

### Before (REST API)
```javascript
// GET /api/v1/chats
const response = await fetch('/api/v1/chats', {
  headers: { Authorization: `Bearer ${token}` }
});
const chats = await response.json();
```

### After (Socket.IO)
```javascript
socket.emit('chats:getAll', {}, (response) => {
  if (response.success) {
    const chats = response.data.chats;
  }
});
```

### Benefits
- ✅ **Reduced Latency**: No HTTP overhead
- ✅ **Real-time Updates**: Instant notifications
- ✅ **Less Server Load**: Persistent connections
- ✅ **Better UX**: Typing indicators, presence, instant delivery

---

## Testing

### Test Connection
```javascript
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});
```

### Test Events
```javascript
// Send a test message
socket.emit('message:send', {
  chatId: 'test123',
  content: 'Test message',
  type: 'text'
}, (response) => {
  console.log('Response:', response);
});
```

---

## Troubleshooting

### Issue: Socket not connecting
**Solution:** Check if token is valid and server is running

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  // Check token validity
});
```

### Issue: Events not firing
**Solution:** Ensure you've joined the chat room

```javascript
socket.emit('chat:join', { chatId }, (response) => {
  if (response.success) {
    // Now you can send/receive messages
  }
});
```

### Issue: Duplicate messages
**Solution:** Clean up event listeners properly

```javascript
useEffect(() => {
  const handler = (data) => console.log(data);
  socket.on('message:new', handler);
  
  return () => socket.off('message:new', handler);
}, []);
```

---

## Summary

This Socket.IO-first architecture provides:
- 🚀 **Real-time communication** with minimal latency
- 📱 **Presence indicators** (online/offline/typing)
- 💬 **Instant message delivery** and read receipts
- 🎯 **Efficient resource usage** with persistent connections
- 🔄 **Automatic reconnection** handling
- ✅ **Reliable delivery** with callbacks

All chat operations are now handled via WebSocket, eliminating the need for polling or repeated API calls!
