# Flutter Socket.IO - Quick Reference Card

## 🚀 Quick Setup

### 1. Add Dependencies
```yaml
dependencies:
  socket_io_client: ^2.0.3+1
  dio: ^5.4.0
  shared_preferences: ^2.2.2
```

### 2. Login & Get Token
```dart
final response = await dio.post('/api/v1/auth/login', data: {
  'identifier': email,
  'password': password,
});
final token = response.data['data']['token'];
```

### 3. Connect Socket
```dart
final socket = IO.io('https://your-api.com', 
  IO.OptionBuilder()
    .setAuth({'token': token})
    .build()
);
```

---

## 📋 All Socket Events

### Chat Operations
```dart
// Get all chats
socket.emitWithAck('chats:getAll', {'page': 1}, (response) {
  final chats = response['data']['chats'];
});

// Create private chat
socket.emitWithAck('chat:createPrivate', {'userId': userId}, (response) {
  final chat = response['data']['chat'];
});

// Join chat room
socket.emitWithAck('chat:join', {'chatId': chatId}, (response) {
  print('Joined chat');
});

// Leave chat room
socket.emit('chat:leave', {'chatId': chatId});

// Delete chat
socket.emitWithAck('chat:delete', {'chatId': chatId}, (response) {
  print('Chat deleted');
});

// Mute/Unmute
socket.emitWithAck('chat:toggleMute', {
  'chatId': chatId,
  'mute': true
}, (response) {});

// Clear unread
socket.emitWithAck('chat:clearUnread', {'chatId': chatId}, (response) {});
```

### Message Operations
```dart
// Get messages
socket.emitWithAck('messages:get', {
  'chatId': chatId,
  'page': 1,
  'limit': 50
}, (response) {
  final messages = response['data']['messages'];
});

// Send message
socket.emitWithAck('message:send', {
  'chatId': chatId,
  'content': 'Hello!',
  'type': 'text'
}, (response) {
  final message = response['data']['message'];
});

// Delete message
socket.emitWithAck('message:delete', {
  'messageId': messageId,
  'chatId': chatId
}, (response) {});

// Mark as read
socket.emit('message:read', {
  'messageId': messageId,
  'chatId': chatId
});

// Mark as delivered
socket.emit('message:delivered', {
  'messageId': messageId,
  'chatId': chatId
});
```

### Typing Indicators
```dart
// Start typing
socket.emit('typing:start', {'chatId': chatId});

// Stop typing
socket.emit('typing:stop', {'chatId': chatId});

// Listen for typing
socket.on('typing:user', (data) {
  if (data['isTyping']) {
    print('${data['username']} is typing...');
  }
});
```

### User Operations
```dart
// Search users
socket.emitWithAck('users:search', {'query': 'john'}, (response) {
  final users = response['data']['users'];
});

// Get nearby users
socket.emitWithAck('users:nearby', {
  'latitude': 23.0225,
  'longitude': 72.5714,
  'radius': 5000
}, (response) {
  final users = response['data']['users'];
});

// Update location
socket.emitWithAck('location:update', {
  'latitude': 23.0225,
  'longitude': 72.5714,
  'address': 'Ahmedabad, India'
}, (response) {});
```

---

## 🔔 Listen for Events

### Real-time Updates
```dart
// New message
socket.on('message:new', (data) {
  final message = data['message'];
  final chatId = data['chatId'];
  // Update UI
});

// New chat
socket.on('chat:new', (data) {
  final chat = data['chat'];
  // Update chat list
});

// Chat deleted
socket.on('chat:deleted', (data) {
  final chatId = data['chatId'];
  // Remove from list
});

// Message deleted
socket.on('message:deleted', (data) {
  final messageId = data['messageId'];
  // Remove from list
});

// User online
socket.on('user:online', (data) {
  final userId = data['userId'];
  final username = data['username'];
  // Update status
});

// User offline
socket.on('user:offline', (data) {
  final userId = data['userId'];
  final lastSeen = data['lastSeen'];
  // Update status
});

// Message read
socket.on('message:read', (data) {
  final messageId = data['messageId'];
  final userId = data['userId'];
  // Update checkmarks
});

// Message delivered
socket.on('message:delivered', (data) {
  final messageId = data['messageId'];
  final userId = data['userId'];
  // Update checkmarks
});
```

---

## 💡 Common Patterns

### Complete Chat Room Setup
```dart
class ChatRoomScreen extends StatefulWidget {
  final String chatId;
  ChatRoomScreen({required this.chatId});
  
  @override
  _ChatRoomScreenState createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final socket = SocketService().socket;
  List<Message> messages = [];
  
  @override
  void initState() {
    super.initState();
    
    // 1. Join chat room
    socket?.emitWithAck('chat:join', {
      'chatId': widget.chatId
    }, (response) {
      print('Joined chat');
    });
    
    // 2. Load messages
    socket?.emitWithAck('messages:get', {
      'chatId': widget.chatId,
      'page': 1,
      'limit': 50
    }, (response) {
      if (response['success']) {
        setState(() {
          messages = (response['data']['messages'] as List)
              .map((json) => Message.fromJson(json))
              .toList();
        });
      }
    });
    
    // 3. Listen for new messages
    socket?.on('message:new', (data) {
      if (data['chatId'] == widget.chatId) {
        setState(() {
          messages.add(Message.fromJson(data['message']));
        });
      }
    });
    
    // 4. Listen for typing
    socket?.on('typing:user', (data) {
      if (data['chatId'] == widget.chatId) {
        // Show typing indicator
      }
    });
  }
  
  void sendMessage(String content) {
    socket?.emitWithAck('message:send', {
      'chatId': widget.chatId,
      'content': content,
      'type': 'text'
    }, (response) {
      if (response['success']) {
        print('Message sent');
      }
    });
  }
  
  @override
  void dispose() {
    // Leave chat room
    socket?.emit('chat:leave', {'chatId': widget.chatId});
    
    // Remove listeners
    socket?.off('message:new');
    socket?.off('typing:user');
    
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    // Your UI here
  }
}
```

### Typing Indicator with Auto-Stop
```dart
Timer? _typingTimer;

void handleTyping() {
  // Emit typing start
  socket.emit('typing:start', {'chatId': chatId});
  
  // Cancel previous timer
  _typingTimer?.cancel();
  
  // Auto-stop after 3 seconds
  _typingTimer = Timer(Duration(seconds: 3), () {
    socket.emit('typing:stop', {'chatId': chatId});
  });
}

// In TextField
TextField(
  onChanged: (text) => handleTyping(),
  // ...
)
```

### Handle Reconnection
```dart
socket.onConnect((_) {
  print('Connected/Reconnected');
  
  // Rejoin all active chats
  for (var chatId in activeChats) {
    socket.emit('chat:join', {'chatId': chatId});
  }
});
```

---

## ⚠️ Important Notes

### 1. Always Join Chat Before Sending
```dart
// ✅ Correct
await socket.emitWithAck('chat:join', {'chatId': chatId}, (_) {});
await socket.emitWithAck('message:send', {...}, (_) {});

// ❌ Wrong
await socket.emitWithAck('message:send', {...}, (_) {}); // Won't work!
```

### 2. Clean Up Listeners
```dart
@override
void dispose() {
  socket.off('message:new');
  socket.off('typing:user');
  socket.off('user:online');
  super.dispose();
}
```

### 3. Check Connection Before Emitting
```dart
if (socket?.connected == true) {
  socket.emit('message:send', {...});
} else {
  print('Socket not connected');
}
```

### 4. Use Callbacks for Important Operations
```dart
// ✅ With callback (recommended)
socket.emitWithAck('message:send', data, (response) {
  if (response['success']) {
    // Success
  } else {
    // Error
  }
});

// ❌ Without callback (no confirmation)
socket.emit('message:send', data);
```

---

## 🔧 Debugging

### Check Connection Status
```dart
print('Connected: ${socket?.connected}');
print('Socket ID: ${socket?.id}');
```

### Listen for Errors
```dart
socket?.onConnectError((error) {
  print('Connection error: $error');
});

socket?.onError((error) {
  print('Socket error: $error');
});
```

### Log All Events
```dart
socket?.onAny((event, data) {
  print('Event: $event, Data: $data');
});
```

---

## 📊 Response Format

All events with callbacks return this format:

```dart
{
  'success': true/false,
  'message': 'Error message if failed',
  'data': {
    // Response data here
  },
  'cached': true/false  // Optional, indicates if from cache
}
```

---

## ✅ Checklist

Before going live:

- [ ] Token is saved securely
- [ ] Socket connects after login
- [ ] Socket disconnects on logout
- [ ] All listeners are cleaned up in dispose()
- [ ] Reconnection logic is implemented
- [ ] Error handling is in place
- [ ] Typing indicators work
- [ ] Messages appear in real-time
- [ ] Read receipts work
- [ ] User presence updates

---

## 🎯 Quick Start Flow

```
1. Login → Get token
2. Connect socket with token
3. Load chats (chats:getAll)
4. Click chat → Join room (chat:join)
5. Load messages (messages:get)
6. Listen for new messages (message:new)
7. Send message (message:send)
8. Leave room on exit (chat:leave)
9. Disconnect on logout
```

---

**Happy coding!** 🚀
