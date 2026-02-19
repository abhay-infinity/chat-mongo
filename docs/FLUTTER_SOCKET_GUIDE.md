# Flutter Socket.IO Integration Guide - Complete

## 📱 Complete Guide for Flutter Developers

This guide shows you **exactly** how to integrate Socket.IO into your Flutter app for the Nearby Chat application, from login to all features.

---

## 📋 Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Project Structure](#project-structure)
3. [Authentication Flow](#authentication-flow)
4. [Socket Connection](#socket-connection)
5. [Chat Features](#chat-features)
6. [Message Features](#message-features)
7. [Real-time Features](#real-time-features)
8. [Complete Examples](#complete-examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Setup & Installation

### Step 1: Add Dependencies

Add to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP client for REST API
  dio: ^5.4.0
  
  # Socket.IO client
  socket_io_client: ^2.0.3+1
  
  # State management (choose one)
  provider: ^6.1.1
  # OR
  riverpod: ^2.4.9
  # OR
  bloc: ^8.1.3
  
  # Local storage
  shared_preferences: ^2.2.2
  
  # JSON serialization
  json_annotation: ^4.8.1

dev_dependencies:
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
```

### Step 2: Install Packages

```bash
flutter pub get
```

---

## 📁 Project Structure

Create this folder structure in your Flutter project:

```
lib/
├── main.dart
├── config/
│   └── api_config.dart           # API URLs and constants
├── models/
│   ├── user.dart                 # User model
│   ├── chat.dart                 # Chat model
│   └── message.dart              # Message model
├── services/
│   ├── auth_service.dart         # Authentication
│   ├── socket_service.dart       # Socket.IO connection
│   ├── chat_service.dart         # Chat operations
│   └── message_service.dart      # Message operations
├── providers/
│   ├── auth_provider.dart        # Auth state
│   ├── socket_provider.dart      # Socket state
│   └── chat_provider.dart        # Chat state
└── screens/
    ├── login_screen.dart         # Login UI
    ├── chat_list_screen.dart     # Chat list UI
    └── chat_room_screen.dart     # Chat room UI
```

---

## 🔐 Authentication Flow

### Step 1: Create API Config

**File: `lib/config/api_config.dart`**

```dart
class ApiConfig {
  // Change this to your server URL
  static const String baseUrl = 'https://your-api.com';
  static const String apiUrl = '$baseUrl/api/v1';
  static const String socketUrl = baseUrl;
  
  // API Endpoints
  static const String loginEndpoint = '$apiUrl/auth/login';
  static const String registerEndpoint = '$apiUrl/auth/register';
  static const String meEndpoint = '$apiUrl/auth/me';
}
```

### Step 2: Create User Model

**File: `lib/models/user.dart`**

```dart
import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

@JsonSerializable()
class User {
  @JsonKey(name: '_id')
  final String id;
  final String username;
  final String email;
  final String? phone;
  final String? avatar;
  final bool isOnline;
  final DateTime? lastSeen;
  
  User({
    required this.id,
    required this.username,
    required this.email,
    this.phone,
    this.avatar,
    this.isOnline = false,
    this.lastSeen,
  });
  
  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}
```

### Step 3: Create Auth Service

**File: `lib/services/auth_service.dart`**

```dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/user.dart';

class AuthService {
  final Dio _dio = Dio();
  
  // Login
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    try {
      final response = await _dio.post(
        ApiConfig.loginEndpoint,
        data: {
          'identifier': identifier,
          'password': password,
        },
      );
      
      if (response.data['success']) {
        final token = response.data['data']['token'];
        final user = User.fromJson(response.data['data']['user']);
        
        // Save token to local storage
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('user_id', user.id);
        
        return {
          'success': true,
          'token': token,
          'user': user,
        };
      }
      
      return {'success': false, 'message': 'Login failed'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
  
  // Register
  Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String phone,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        ApiConfig.registerEndpoint,
        data: {
          'username': username,
          'email': email,
          'phone': phone,
          'password': password,
        },
      );
      
      if (response.data['success']) {
        final token = response.data['data']['token'];
        final user = User.fromJson(response.data['data']['user']);
        
        // Save token
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('user_id', user.id);
        
        return {
          'success': true,
          'token': token,
          'user': user,
        };
      }
      
      return {'success': false, 'message': 'Registration failed'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
  
  // Get saved token
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }
  
  // Logout
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_id');
  }
  
  // Check if logged in
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null;
  }
}
```

---

## 🔌 Socket Connection

### Step 1: Create Socket Service

**File: `lib/services/socket_service.dart`**

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/api_config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();
  
  IO.Socket? _socket;
  bool _isConnected = false;
  
  // Getters
  IO.Socket? get socket => _socket;
  bool get isConnected => _isConnected;
  
  // Connect to Socket.IO
  Future<void> connect(String token) async {
    if (_socket != null && _isConnected) {
      print('Socket already connected');
      return;
    }
    
    print('Connecting to Socket.IO...');
    
    _socket = IO.io(
      ApiConfig.socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setAuth({'token': token})
          .build(),
    );
    
    // Connection events
    _socket!.onConnect((_) {
      print('✅ Socket connected: ${_socket!.id}');
      _isConnected = true;
    });
    
    _socket!.onDisconnect((_) {
      print('❌ Socket disconnected');
      _isConnected = false;
    });
    
    _socket!.onConnectError((error) {
      print('❌ Connection error: $error');
      _isConnected = false;
    });
    
    _socket!.onError((error) {
      print('❌ Socket error: $error');
    });
    
    // Connect
    _socket!.connect();
  }
  
  // Disconnect
  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
      _isConnected = false;
      print('Socket disconnected and disposed');
    }
  }
  
  // Emit event with callback
  void emitWithAck(String event, dynamic data, Function(dynamic) callback) {
    if (_socket != null && _isConnected) {
      _socket!.emitWithAck(event, data, ack: callback);
    } else {
      print('Socket not connected. Cannot emit: $event');
      callback({'success': false, 'message': 'Socket not connected'});
    }
  }
  
  // Listen to event
  void on(String event, Function(dynamic) handler) {
    _socket?.on(event, handler);
  }
  
  // Remove listener
  void off(String event) {
    _socket?.off(event);
  }
}
```

### Step 2: Initialize Socket After Login

**File: `lib/screens/login_screen.dart`**

```dart
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import 'chat_list_screen.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _authService = AuthService();
  final _socketService = SocketService();
  
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  
  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);
    
    final result = await _authService.login(
      _emailController.text,
      _passwordController.text,
    );
    
    if (result['success']) {
      // Login successful - Connect to Socket.IO
      final token = result['token'];
      
      // Connect socket
      await _socketService.connect(token);
      
      // Navigate to chat list
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => ChatListScreen()),
      );
    } else {
      // Show error
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'])),
      );
    }
    
    setState(() => _isLoading = false);
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _emailController,
              decoration: InputDecoration(
                labelText: 'Email or Phone',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(
                labelText: 'Password',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoading ? null : _handleLogin,
              child: _isLoading
                  ? CircularProgressIndicator()
                  : Text('Login'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 💬 Chat Features

### Step 1: Create Chat Model

**File: `lib/models/chat.dart`**

```dart
import 'package:json_annotation/json_annotation.dart';
import 'user.dart';
import 'message.dart';

part 'chat.g.dart';

@JsonSerializable()
class Chat {
  @JsonKey(name: '_id')
  final String id;
  final String type; // 'private' or 'group'
  final List<User> participants;
  final Message? lastMessage;
  final Map<String, int>? unreadCount;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  Chat({
    required this.id,
    required this.type,
    required this.participants,
    this.lastMessage,
    this.unreadCount,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });
  
  factory Chat.fromJson(Map<String, dynamic> json) => _$ChatFromJson(json);
  Map<String, dynamic> toJson() => _$ChatToJson(this);
  
  // Get other user in private chat
  User? getOtherUser(String currentUserId) {
    if (type == 'private') {
      return participants.firstWhere(
        (user) => user.id != currentUserId,
        orElse: () => participants.first,
      );
    }
    return null;
  }
}
```

### Step 2: Create Chat Service

**File: `lib/services/chat_service.dart`**

```dart
import '../services/socket_service.dart';
import '../models/chat.dart';

class ChatService {
  final _socketService = SocketService();
  
  // Get all chats
  Future<List<Chat>> getAllChats({int page = 1, int limit = 20}) async {
    final completer = Completer<List<Chat>>();
    
    _socketService.emitWithAck('chats:getAll', {
      'page': page,
      'limit': limit,
    }, (response) {
      if (response['success']) {
        final chats = (response['data']['chats'] as List)
            .map((json) => Chat.fromJson(json))
            .toList();
        completer.complete(chats);
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Create private chat
  Future<Chat> createPrivateChat(String userId) async {
    final completer = Completer<Chat>();
    
    _socketService.emitWithAck('chat:createPrivate', {
      'userId': userId,
    }, (response) {
      if (response['success']) {
        final chat = Chat.fromJson(response['data']['chat']);
        completer.complete(chat);
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Join chat room
  Future<void> joinChat(String chatId) async {
    final completer = Completer<void>();
    
    _socketService.emitWithAck('chat:join', {
      'chatId': chatId,
    }, (response) {
      if (response['success']) {
        print('Joined chat: $chatId');
        completer.complete();
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Leave chat room
  void leaveChat(String chatId) {
    _socketService.emitWithAck('chat:leave', {
      'chatId': chatId,
    }, (response) {
      print('Left chat: $chatId');
    });
  }
  
  // Delete chat
  Future<void> deleteChat(String chatId) async {
    final completer = Completer<void>();
    
    _socketService.emitWithAck('chat:delete', {
      'chatId': chatId,
    }, (response) {
      if (response['success']) {
        completer.complete();
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Mute/Unmute chat
  Future<void> toggleMute(String chatId, bool mute) async {
    final completer = Completer<void>();
    
    _socketService.emitWithAck('chat:toggleMute', {
      'chatId': chatId,
      'mute': mute,
    }, (response) {
      if (response['success']) {
        completer.complete();
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Clear unread count
  Future<void> clearUnread(String chatId) async {
    _socketService.emitWithAck('chat:clearUnread', {
      'chatId': chatId,
    }, (response) {
      print('Unread cleared for: $chatId');
    });
  }
  
  // Listen for new chats
  void onNewChat(Function(Chat) callback) {
    _socketService.on('chat:new', (data) {
      final chat = Chat.fromJson(data['chat']);
      callback(chat);
    });
  }
  
  // Listen for deleted chats
  void onChatDeleted(Function(String) callback) {
    _socketService.on('chat:deleted', (data) {
      callback(data['chatId']);
    });
  }
}
```

### Step 3: Chat List Screen

**File: `lib/screens/chat_list_screen.dart`**

```dart
import 'package:flutter/material.dart';
import '../services/chat_service.dart';
import '../services/socket_service.dart';
import '../models/chat.dart';
import 'chat_room_screen.dart';

class ChatListScreen extends StatefulWidget {
  @override
  _ChatListScreenState createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  final _chatService = ChatService();
  final _socketService = SocketService();
  
  List<Chat> _chats = [];
  bool _isLoading = true;
  
  @override
  void initState() {
    super.initState();
    _loadChats();
    _setupListeners();
  }
  
  Future<void> _loadChats() async {
    setState(() => _isLoading = true);
    
    try {
      final chats = await _chatService.getAllChats();
      setState(() {
        _chats = chats;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading chats: $e');
      setState(() => _isLoading = false);
    }
  }
  
  void _setupListeners() {
    // Listen for new chats
    _chatService.onNewChat((chat) {
      setState(() {
        _chats.insert(0, chat);
      });
    });
    
    // Listen for deleted chats
    _chatService.onChatDeleted((chatId) {
      setState(() {
        _chats.removeWhere((chat) => chat.id == chatId);
      });
    });
    
    // Listen for new messages (to update last message)
    _socketService.on('message:new', (data) {
      final chatId = data['chatId'];
      final messageData = data['message'];
      
      setState(() {
        final index = _chats.indexWhere((c) => c.id == chatId);
        if (index != -1) {
          // Move chat to top and update last message
          final chat = _chats.removeAt(index);
          _chats.insert(0, chat);
        }
      });
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chats'),
        actions: [
          // Socket connection indicator
          Padding(
            padding: EdgeInsets.all(16),
            child: Icon(
              Icons.circle,
              color: _socketService.isConnected ? Colors.green : Colors.red,
              size: 12,
            ),
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _chats.isEmpty
              ? Center(child: Text('No chats yet'))
              : RefreshIndicator(
                  onRefresh: _loadChats,
                  child: ListView.builder(
                    itemCount: _chats.length,
                    itemBuilder: (context, index) {
                      final chat = _chats[index];
                      final otherUser = chat.getOtherUser('currentUserId');
                      
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage: otherUser?.avatar != null
                              ? NetworkImage(otherUser!.avatar!)
                              : null,
                          child: otherUser?.avatar == null
                              ? Text(otherUser?.username[0].toUpperCase() ?? '?')
                              : null,
                        ),
                        title: Text(otherUser?.username ?? 'Unknown'),
                        subtitle: Text(
                          chat.lastMessage?.content ?? 'No messages yet',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: otherUser?.isOnline == true
                            ? Icon(Icons.circle, color: Colors.green, size: 12)
                            : null,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatRoomScreen(chat: chat),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
    );
  }
  
  @override
  void dispose() {
    // Clean up listeners
    _socketService.off('chat:new');
    _socketService.off('chat:deleted');
    _socketService.off('message:new');
    super.dispose();
  }
}
```

---

## 📨 Message Features

### Step 1: Create Message Model

**File: `lib/models/message.dart`**

```dart
import 'package:json_annotation/json_annotation.dart';
import 'user.dart';

part 'message.g.dart';

@JsonSerializable()
class Message {
  @JsonKey(name: '_id')
  final String id;
  final String chat;
  final User sender;
  final String content;
  final String type; // 'text', 'image', 'video', etc.
  final bool isDeleted;
  final DateTime createdAt;
  
  Message({
    required this.id,
    required this.chat,
    required this.sender,
    required this.content,
    this.type = 'text',
    this.isDeleted = false,
    required this.createdAt,
  });
  
  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(json);
  Map<String, dynamic> toJson() => _$MessageToJson(this);
}
```

### Step 2: Create Message Service

**File: `lib/services/message_service.dart`**

```dart
import 'dart:async';
import '../services/socket_service.dart';
import '../models/message.dart';

class MessageService {
  final _socketService = SocketService();
  
  // Get messages
  Future<List<Message>> getMessages(String chatId, {int page = 1, int limit = 50}) async {
    final completer = Completer<List<Message>>();
    
    _socketService.emitWithAck('messages:get', {
      'chatId': chatId,
      'page': page,
      'limit': limit,
    }, (response) {
      if (response['success']) {
        final messages = (response['data']['messages'] as List)
            .map((json) => Message.fromJson(json))
            .toList();
        completer.complete(messages);
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Send message
  Future<Message> sendMessage(String chatId, String content, {String type = 'text'}) async {
    final completer = Completer<Message>();
    
    _socketService.emitWithAck('message:send', {
      'chatId': chatId,
      'content': content,
      'type': type,
    }, (response) {
      if (response['success']) {
        final message = Message.fromJson(response['data']['message']);
        completer.complete(message);
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Delete message
  Future<void> deleteMessage(String messageId, String chatId) async {
    final completer = Completer<void>();
    
    _socketService.emitWithAck('message:delete', {
      'messageId': messageId,
      'chatId': chatId,
    }, (response) {
      if (response['success']) {
        completer.complete();
      } else {
        completer.completeError(response['message']);
      }
    });
    
    return completer.future;
  }
  
  // Mark as read
  void markAsRead(String messageId, String chatId) {
    _socketService.emitWithAck('message:read', {
      'messageId': messageId,
      'chatId': chatId,
    }, (_) {});
  }
  
  // Listen for new messages
  void onNewMessage(Function(Message) callback) {
    _socketService.on('message:new', (data) {
      final message = Message.fromJson(data['message']);
      callback(message);
    });
  }
  
  // Listen for deleted messages
  void onMessageDeleted(Function(String) callback) {
    _socketService.on('message:deleted', (data) {
      callback(data['messageId']);
    });
  }
}
```

### Step 3: Chat Room Screen

**File: `lib/screens/chat_room_screen.dart`**

```dart
import 'package:flutter/material.dart';
import '../services/message_service.dart';
import '../services/socket_service.dart';
import '../models/chat.dart';
import '../models/message.dart';
import 'dart:async';

class ChatRoomScreen extends StatefulWidget {
  final Chat chat;
  
  ChatRoomScreen({required this.chat});
  
  @override
  _ChatRoomScreenState createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final _messageService = MessageService();
  final _socketService = SocketService();
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  
  List<Message> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  String _typingUser = '';
  Timer? _typingTimer;
  
  @override
  void initState() {
    super.initState();
    _joinChatAndLoadMessages();
    _setupListeners();
  }
  
  Future<void> _joinChatAndLoadMessages() async {
    // Join chat room first
    await _socketService.emitWithAck('chat:join', {
      'chatId': widget.chat.id,
    }, (response) {
      print('Joined chat: ${widget.chat.id}');
    });
    
    // Load messages
    await _loadMessages();
  }
  
  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    
    try {
      final messages = await _messageService.getMessages(widget.chat.id);
      setState(() {
        _messages = messages;
        _isLoading = false;
      });
      
      // Scroll to bottom
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToBottom();
      });
    } catch (e) {
      print('Error loading messages: $e');
      setState(() => _isLoading = false);
    }
  }
  
  void _setupListeners() {
    // Listen for new messages
    _messageService.onNewMessage((message) {
      if (message.chat == widget.chat.id) {
        setState(() {
          _messages.add(message);
        });
        _scrollToBottom();
        
        // Mark as read
        _messageService.markAsRead(message.id, widget.chat.id);
      }
    });
    
    // Listen for typing indicator
    _socketService.on('typing:user', (data) {
      if (data['chatId'] == widget.chat.id) {
        setState(() {
          _typingUser = data['isTyping'] ? data['username'] : '';
        });
      }
    });
    
    // Listen for deleted messages
    _messageService.onMessageDeleted((messageId) {
      setState(() {
        _messages.removeWhere((m) => m.id == messageId);
      });
    });
  }
  
  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }
  
  void _handleTyping() {
    // Emit typing start
    _socketService.socket?.emit('typing:start', {'chatId': widget.chat.id});
    
    // Cancel previous timer
    _typingTimer?.cancel();
    
    // Set timer to stop typing after 3 seconds
    _typingTimer = Timer(Duration(seconds: 3), () {
      _socketService.socket?.emit('typing:stop', {'chatId': widget.chat.id});
    });
  }
  
  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;
    
    setState(() => _isSending = true);
    
    // Stop typing
    _socketService.socket?.emit('typing:stop', {'chatId': widget.chat.id});
    _typingTimer?.cancel();
    
    try {
      await _messageService.sendMessage(widget.chat.id, content);
      _messageController.clear();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send message')),
      );
    }
    
    setState(() => _isSending = false);
  }
  
  @override
  Widget build(BuildContext context) {
    final otherUser = widget.chat.getOtherUser('currentUserId');
    
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(otherUser?.username ?? 'Chat'),
            if (_typingUser.isNotEmpty)
              Text(
                '$_typingUser is typing...',
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isMe = message.sender.id == 'currentUserId';
                      
                      return Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isMe ? Colors.blue : Colors.grey[300],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!isMe)
                                Text(
                                  message.sender.username,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              Text(
                                message.content,
                                style: TextStyle(
                                  color: isMe ? Colors.white : Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          
          // Input area
          Container(
            padding: EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 4,
                  offset: Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    onChanged: (_) => _handleTyping(),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                SizedBox(width: 8),
                IconButton(
                  icon: _isSending
                      ? CircularProgressIndicator()
                      : Icon(Icons.send),
                  onPressed: _isSending ? null : _sendMessage,
                  color: Colors.blue,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  @override
  void dispose() {
    // Leave chat room
    _socketService.socket?.emit('chat:leave', {'chatId': widget.chat.id});
    
    // Clean up
    _messageController.dispose();
    _scrollController.dispose();
    _typingTimer?.cancel();
    _socketService.off('message:new');
    _socketService.off('typing:user');
    _socketService.off('message:deleted');
    super.dispose();
  }
}
```

---

## ⚡ Real-time Features

### User Presence Tracking

```dart
// In your main app or chat list screen
void _setupPresenceListeners() {
  final socketService = SocketService();
  
  // User came online
  socketService.on('user:online', (data) {
    print('User ${data['username']} came online');
    // Update UI to show user is online
  });
  
  // User went offline
  socketService.on('user:offline', (data) {
    print('User ${data['username']} went offline');
    print('Last seen: ${data['lastSeen']}');
    // Update UI to show user is offline
  });
}
```

### Search Users

```dart
Future<List<User>> searchUsers(String query) async {
  final completer = Completer<List<User>>();
  final socketService = SocketService();
  
  socketService.emitWithAck('users:search', {
    'query': query,
  }, (response) {
    if (response['success']) {
      final users = (response['data']['users'] as List)
          .map((json) => User.fromJson(json))
          .toList();
      completer.complete(users);
    } else {
      completer.completeError(response['message']);
    }
  });
  
  return completer.future;
}
```

### Update Location

```dart
Future<void> updateLocation(double latitude, double longitude, String address) async {
  final socketService = SocketService();
  
  socketService.emitWithAck('location:update', {
    'latitude': latitude,
    'longitude': longitude,
    'address': address,
  }, (response) {
    if (response['success']) {
      print('Location updated successfully');
    }
  });
}
```

---

## 📖 Complete Flow Example

### Complete App Flow from Login to Messaging

```dart
// main.dart
import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';
import 'services/socket_service.dart';
import 'screens/chat_list_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nearby Chat',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final _authService = AuthService();
  final _socketService = SocketService();
  
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }
  
  Future<void> _checkAuth() async {
    // Check if user is logged in
    final isLoggedIn = await _authService.isLoggedIn();
    
    if (isLoggedIn) {
      // Get token and connect socket
      final token = await _authService.getToken();
      if (token != null) {
        await _socketService.connect(token);
        
        // Navigate to chat list
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => ChatListScreen()),
        );
      } else {
        _navigateToLogin();
      }
    } else {
      _navigateToLogin();
    }
  }
  
  void _navigateToLogin() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen()),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
```

---

## ✅ Best Practices

### 1. Always Check Socket Connection

```dart
void sendMessage() {
  if (!_socketService.isConnected) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Not connected to server')),
    );
    return;
  }
  
  // Send message
}
```

### 2. Handle Reconnection

```dart
void _setupReconnection() {
  _socketService.on('connect', (_) {
    print('Reconnected! Rejoining rooms...');
    
    // Rejoin all active chats
    for (var chat in _activeChats) {
      _socketService.socket?.emit('chat:join', {'chatId': chat.id});
    }
  });
}
```

### 3. Clean Up Listeners

```dart
@override
void dispose() {
  // Always remove listeners
  _socketService.off('message:new');
  _socketService.off('typing:user');
  _socketService.off('user:online');
  super.dispose();
}
```

### 4. Use Timeouts for Requests

```dart
Future<List<Chat>> getAllChatsWithTimeout() async {
  return _chatService.getAllChats().timeout(
    Duration(seconds: 10),
    onTimeout: () {
      throw TimeoutException('Request timed out');
    },
  );
}
```

---

## 🐛 Troubleshooting

### Socket Not Connecting?

```dart
// Check connection status
print('Socket connected: ${_socketService.isConnected}');
print('Socket ID: ${_socketService.socket?.id}');

// Listen for errors
_socketService.socket?.onConnectError((error) {
  print('Connection error: $error');
});
```

### Messages Not Appearing?

```dart
// Make sure you joined the chat room
await _socketService.emitWithAck('chat:join', {
  'chatId': chatId,
}, (response) {
  print('Join response: $response');
});

// Check if listener is set up
_socketService.on('message:new', (data) {
  print('New message received: $data');
});
```

### Token Expired?

```dart
_socketService.socket?.onConnectError((error) {
  if (error.toString().contains('Authentication')) {
    // Token expired - logout and redirect to login
    _authService.logout();
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen()),
    );
  }
});
```

---

## 📝 Summary

### Complete Flow

1. **Login** → Get JWT token
2. **Connect Socket** → Pass token to Socket.IO
3. **Load Chats** → Emit `chats:getAll`
4. **Join Chat** → Emit `chat:join`
5. **Load Messages** → Emit `messages:get`
6. **Send Message** → Emit `message:send`
7. **Listen for Updates** → Listen to `message:new`, `typing:user`, etc.
8. **Leave Chat** → Emit `chat:leave`
9. **Logout** → Disconnect socket

### All Socket Events

**Chat Operations:**
- `chats:getAll` - Get all chats
- `chat:createPrivate` - Create private chat
- `chat:join` - Join chat room
- `chat:leave` - Leave chat room
- `chat:delete` - Delete chat
- `chat:toggleMute` - Mute/unmute

**Message Operations:**
- `messages:get` - Get messages
- `message:send` - Send message
- `message:delete` - Delete message
- `message:read` - Mark as read

**Real-time Events (Listen):**
- `message:new` - New message
- `typing:user` - Typing status
- `user:online` - User online
- `user:offline` - User offline
- `chat:new` - New chat
- `chat:deleted` - Chat deleted

**User Operations:**
- `users:search` - Search users
- `users:nearby` - Get nearby users
- `location:update` - Update location

---

**You're all set!** This guide covers everything from login to real-time messaging in Flutter. 🚀
