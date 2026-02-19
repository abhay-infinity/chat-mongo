# Flutter Developer API Documentation - Nearby Chat
# API Documentation - Flutter Developer માટે સંપૂર્ણ માર્ગદર્શિકા

---

## 📱 Base URL
```
Production: https://your-api-domain.com
Development: http://localhost:3000
```

---

## 🔐 Authentication Header
બધા protected APIs માટે આ header જરૂરી છે:
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

---

## 📋 Table of Contents
1. [Authentication APIs](#1-authentication-apis)
2. [Chat APIs](#2-chat-apis)
3. [Coin & Reward APIs](#3-coin--reward-apis)
4. [User APIs](#4-user-apis)
5. [Message APIs](#5-message-apis)
6. [Error Handling](#error-handling)

---

# 1. Authentication APIs

## 1.1 Guest Login (Silent Login)
**Endpoint:** `POST /api/auth/guest-login`

**Description:** App launch પર automatically guest account બનાવવા માટે. કોઈ registration વગર user app use કરી શકે.

**Request Body:**
```json
{
  "deviceId": "unique_device_id_12345"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Guest login successful. You can upgrade to full account anytime!",
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "username": "User1234",
      "isGuest": true,
      "coins": 50,
      "avatar": null,
      "gender": "unknown",
      "age": null,
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "referralCode": "ABC123XY"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isGuest": true
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Device ID is required"
}
```

**Flutter Example:**
```dart
Future<Map<String, dynamic>> guestLogin(String deviceId) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/auth/guest-login'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'deviceId': deviceId}),
  );
  
  if (response.statusCode == 201) {
    final data = jsonDecode(response.body);
    // Save token locally
    await storage.write(key: 'auth_token', value: data['data']['token']);
    return data;
  } else {
    throw Exception('Guest login failed');
  }
}
```

---

## 1.2 Register (Permanent Account)
**Endpoint:** `POST /api/auth/register`

**Description:** Guest account ને permanent account માં upgrade કરવા માટે અથવા નવું account બનાવવા માટે.

**Headers:**
```
Authorization: Bearer <GUEST_TOKEN>  (optional - guest upgrade માટે)
```

**Request Body:**
```json
{
  "username": "abhay_patel",
  "email": "abhay@example.com",
  "phone": "9876543210",
  "password": "SecurePass@123",
  "gender": "male",
  "age": 25,
  "referralCode": "FRIEND123",
  "upgradeFromGuest": true
}
```

**Field Details:**
- `username`: 3-30 characters, only letters, numbers, underscore
- `email`: Valid email address
- `phone`: Valid mobile number
- `password`: Minimum 6 characters
- `gender`: "male", "female", "other", or "unknown"
- `age`: Number (optional)
- `referralCode`: અન્ય user નો referral code (optional) - 25 coins bonus મળશે referrer ને
- `upgradeFromGuest`: true if upgrading from guest account

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "username": "abhay_patel",
      "email": "abhay@example.com",
      "phone": "9876543210",
      "gender": "male",
      "age": 25,
      "coins": 100,
      "isGuest": false,
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "referralCode": "ABHAY789",
      "referredBy": "65f1a2b3c4d5e6f7g8h9i0j2"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "User already exists with this email, phone, or username"
}
```

---

## 1.3 Login
**Endpoint:** `POST /api/auth/login`

**Description:** Email, phone અથવા username થી login કરવા માટે.

**Request Body:**
```json
{
  "identifier": "abhay@example.com",
  "password": "SecurePass@123"
}
```

**Note:** `identifier` માં email, phone number અથવા username કોઈ પણ આપી શકાય.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "username": "abhay_patel",
      "email": "abhay@example.com",
      "coins": 150,
      "avatar": "https://example.com/avatar.jpg",
      "gender": "male",
      "age": 25
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

## 1.4 Send OTP
**Endpoint:** `POST /api/auth/send-otp`

**Description:** Email અથવા phone પર OTP મોકલવા માટે.

**Request Body:**
```json
{
  "identifier": "abhay@example.com",
  "type": "email",
  "purpose": "registration"
}
```

**Field Details:**
- `type`: "email" or "phone"
- `purpose`: "registration", "login", or "reset_password"

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP sent to abhay@example.com",
  "data": {
    "expiresIn": 10
  }
}
```

**Note:** Development માં OTP console માં print થશે. Production માં email/SMS થી મોકલાશે.

---

## 1.5 Verify OTP
**Endpoint:** `POST /api/auth/verify-otp`

**Description:** OTP verify કરવા માટે.

**Request Body:**
```json
{
  "identifier": "abhay@example.com",
  "otp": "123456",
  "type": "email",
  "purpose": "registration"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Invalid OTP",
  "attemptsLeft": 3
}
```

---

## 1.6 Get Current User
**Endpoint:** `GET /api/auth/me`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "username": "abhay_patel",
      "email": "abhay@example.com",
      "phone": "9876543210",
      "coins": 150,
      "avatar": "https://example.com/avatar.jpg",
      "gender": "male",
      "age": 25,
      "isGuest": false,
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "referralCode": "ABHAY789"
    }
  }
}
```

---

## 1.7 Logout
**Endpoint:** `POST /api/auth/logout`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

# 2. Chat APIs

## 2.1 Initiate Send (Map પર Request મૂકવી)
**Endpoint:** `POST /api/chats/initiate-send`

**Headers:** `Authorization: Bearer <TOKEN>`

**Description:** User ની chat request global pool માં મૂકવા માટે. આ request map પર બીજા users ને દેખાશે.

**Request Body:**
```json
{
  "message": "Hey! Looking for someone to chat with 😊",
  "preferences": {
    "gender": "female",
    "ageRange": "18-25"
  },
  "location": {
    "type": "Point",
    "coordinates": [72.5714, 23.0225]
  }
}
```

**Field Details:**
- `message`: તમારો message (optional, default: "Hey! Want to chat?")
- `preferences.gender`: "male", "female", "other", or "any"
- `preferences.ageRange`: "18-25", "26-35", "36-45", "any"
- `location`: GeoJSON Point format - [longitude, latitude]

**Coin Deduction:**
- Base cost: 10 coins
- Filter cost: +5 coins (જો gender અથવા age filter use કર્યું હોય)

**Response (Auto-Match થયું - 201):**
```json
{
  "success": true,
  "message": "Auto-Matched with a sender immediately!",
  "data": {
    "chat": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "type": "private",
      "participants": [
        {
          "_id": "user1_id",
          "username": "User1234",
          "avatar": null,
          "gender": "female",
          "age": 22
        },
        {
          "_id": "user2_id",
          "username": "abhay_patel",
          "avatar": "https://example.com/avatar.jpg",
          "gender": "male",
          "age": 25
        }
      ],
      "isRandomChat": true,
      "expiresAt": "2026-01-23T22:00:00.000Z",
      "createdAt": "2026-01-22T22:00:00.000Z"
    },
    "balance": 135,
    "isMatched": true
  }
}
```

**Response (Pool માં Add થયું - 201):**
```json
{
  "success": true,
  "message": "Request added to global pool",
  "data": {
    "poolEntry": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "sender": "user_id",
      "message": "Hey! Looking for someone to chat with 😊",
      "preferences": {
        "gender": "female",
        "ageRange": "18-25"
      },
      "location": {
        "type": "Point",
        "coordinates": [72.5714, 23.0225]
      },
      "isActive": true,
      "expiresAt": "2026-01-22T23:00:00.000Z"
    },
    "balance": 135,
    "isMatched": false
  }
}
```

**Response (Insufficient Coins - 400):**
```json
{
  "success": false,
  "message": "Insufficient coins",
  "required": 15,
  "available": 5
}
```

---

## 2.2 Get Active Pool (Map માટે)
**Endpoint:** `GET /api/chats/pool`

**Headers:** `Authorization: Bearer <TOKEN>`

**Description:** Map પર બધા active chat requests જોવા માટે.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "poolEntries": [
      {
        "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "sender": {
          "_id": "user1_id",
          "username": "User5678",
          "avatar": null,
          "gender": "female",
          "age": 24
        },
        "message": "Looking for a fun chat! 🎉",
        "preferences": {
          "gender": "any",
          "ageRange": "20-30"
        },
        "location": {
          "type": "Point",
          "coordinates": [72.5800, 23.0300]
        },
        "isActive": true,
        "expiresAt": "2026-01-22T23:30:00.000Z",
        "createdAt": "2026-01-22T22:30:00.000Z"
      },
      {
        "_id": "65f1a2b3c4d5e6f7g8h9i0j2",
        "sender": {
          "_id": "user2_id",
          "username": "User9012",
          "avatar": "https://example.com/avatar2.jpg",
          "gender": "male",
          "age": 28
        },
        "message": "Hey! Want to chat?",
        "preferences": {
          "gender": "female",
          "ageRange": "any"
        },
        "location": {
          "type": "Point",
          "coordinates": [72.5900, 23.0400]
        },
        "isActive": true,
        "expiresAt": "2026-01-22T23:45:00.000Z",
        "createdAt": "2026-01-22T22:45:00.000Z"
      }
    ]
  }
}
```

**Flutter Example (Map પર Markers દેખાડવા):**
```dart
Future<List<PoolEntry>> getActivePool() async {
  final token = await storage.read(key: 'auth_token');
  final response = await http.get(
    Uri.parse('$baseUrl/api/chats/pool'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    return (data['data']['poolEntries'] as List)
        .map((e) => PoolEntry.fromJson(e))
        .toList();
  }
  throw Exception('Failed to load pool');
}
```

---

## 2.3 Accept Send (Chat Start કરવી)
**Endpoint:** `POST /api/chats/accept-send/:poolId`

**Headers:** `Authorization: Bearer <TOKEN>`

**Description:** Map પરની કોઈ request accept કરીને chat start કરવા માટે.

**URL Parameter:**
- `poolId`: Pool entry નો ID

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Chat started successfully",
  "data": {
    "chat": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "type": "private",
      "participants": [
        {
          "_id": "sender_id",
          "username": "User5678",
          "avatar": null,
          "gender": "female",
          "age": 24
        },
        {
          "_id": "receiver_id",
          "username": "abhay_patel",
          "avatar": "https://example.com/avatar.jpg",
          "gender": "male",
          "age": 25
        }
      ],
      "isRandomChat": true,
      "expiresAt": "2026-01-23T22:00:00.000Z",
      "createdAt": "2026-01-22T22:00:00.000Z",
      "lastMessage": null,
      "unreadCount": {
        "sender_id": 0,
        "receiver_id": 0
      }
    }
  }
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Request no longer available"
}
```

---

## 2.4 Get All Chats
**Endpoint:** `GET /api/chats`

**Headers:** `Authorization: Bearer <TOKEN>`

**Description:** User ની બધી active chats list માટે.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "_id": "chat1_id",
        "type": "private",
        "participants": [
          {
            "_id": "other_user_id",
            "username": "User5678",
            "avatar": null
          }
        ],
        "lastMessage": {
          "content": "Hey! How are you?",
          "createdAt": "2026-01-22T22:30:00.000Z"
        },
        "unreadCount": 3,
        "isRandomChat": true,
        "expiresAt": "2026-01-23T22:00:00.000Z",
        "isMuted": false,
        "updatedAt": "2026-01-22T22:30:00.000Z"
      }
    ]
  }
}
```

---

## 2.5 Get Chat by ID
**Endpoint:** `GET /api/chats/:chatId`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "chat": {
      "_id": "chat_id",
      "type": "private",
      "participants": [...],
      "messages": [...],
      "expiresAt": "2026-01-23T22:00:00.000Z"
    }
  }
}
```

---

## 2.6 Extend Chat Duration
**Endpoint:** `POST /api/chats/extend-chat/:chatId`

**Headers:** `Authorization: Bearer <TOKEN>`

**Description:** Chat નો expiry time વધારવા માટે.

**Request Body:**
```json
{
  "hours": 24
}
```

**Field Details:**
- `hours`: 24 અથવા 48 (24h = 50 coins, 48h = 90 coins)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Chat extended by 24 hours",
  "data": {
    "expiresAt": "2026-01-24T22:00:00.000Z",
    "balance": 85
  }
}
```

**Response (Insufficient Coins - 400):**
```json
{
  "success": false,
  "message": "Insufficient coins",
  "required": 50,
  "available": 30
}
```

---

## 2.7 Delete Chat
**Endpoint:** `DELETE /api/chats/:chatId`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

---

## 2.8 Mute/Unmute Chat
**Endpoint:** `PUT /api/chats/:chatId/mute`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Chat muted successfully",
  "data": {
    "isMuted": true
  }
}
```

---

## 2.9 Clear Unread Count
**Endpoint:** `PUT /api/chats/:chatId/clear-unread`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Unread count cleared"
}
```

---

# 3. Coin & Reward APIs

## 3.1 Get Coin Balance
**Endpoint:** `GET /api/coins/balance`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "coins": 150,
    "recentTransactions": [
      {
        "amount": -15,
        "reason": "Initiated random chat request",
        "type": "spend",
        "createdAt": "2026-01-22T22:00:00.000Z"
      },
      {
        "amount": 10,
        "reason": "Watched Ad Reward",
        "type": "earn",
        "createdAt": "2026-01-22T21:30:00.000Z"
      },
      {
        "amount": 10,
        "reason": "Daily Bonus",
        "type": "bonus",
        "createdAt": "2026-01-22T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 3.2 Get Coin Prices
**Endpoint:** `GET /api/coins/prices`

**Description:** બધા features ની coin prices જોવા માટે.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "prices": {
      "send_request": 10,
      "age_filter_extra": 5,
      "extend_chat_24h": 50,
      "extend_chat_48h": 90
    },
    "rewards": {
      "guest_signup": 50,
      "full_registration": 150,
      "upgrade_bonus": 50,
      "ad_watch": 10,
      "daily_bonus": 10,
      "referral_reward": 25
    }
  }
}
```

---

## 3.3 Watch Ad Reward
**Endpoint:** `POST /api/coins/watch-ad`

**Headers:** `Authorization: Bearer <TOKEN>`

**Description:** User એ ad જોયા પછી આ API call કરવી. 10 coins reward મળશે.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Reward claimed! +10 coins",
  "data": {
    "coins": 160,
    "reward": 10
  }
}
```

**Flutter Example:**
```dart
Future<void> claimAdReward() async {
  // પહેલા ad show કરો
  await showRewardedAd();
  
  // પછી reward claim કરો
  final token = await storage.read(key: 'auth_token');
  final response = await http.post(
    Uri.parse('$baseUrl/api/coins/watch-ad'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    print('Coins earned: ${data['data']['reward']}');
  }
}
```

---

## 3.4 Claim Daily Bonus
**Endpoint:** `POST /api/coins/daily-bonus`

**Headers:** `Authorization: Bearer <TOKEN>`

**Description:** દરરોજ એક વાર 10 coins free claim કરી શકાય.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Daily bonus claimed! +10 coins",
  "data": {
    "coins": 170,
    "bonusAmount": 10
  }
}
```

**Response (Already Claimed - 400):**
```json
{
  "success": false,
  "message": "Daily bonus already claimed today",
  "nextClaimIn": "Tomorrow"
}
```

---

## 3.5 Get Transaction History
**Endpoint:** `GET /api/coins/transactions`

**Headers:** `Authorization: Bearer <TOKEN>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "amount": -15,
        "reason": "Initiated random chat request",
        "type": "spend",
        "createdAt": "2026-01-22T22:00:00.000Z"
      },
      {
        "amount": 10,
        "reason": "Watched Ad Reward",
        "type": "earn",
        "createdAt": "2026-01-22T21:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95
    }
  }
}
```

---

# 4. User APIs

## 4.1 Get User Profile
**Endpoint:** `GET /api/users/:userId`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "abhay_patel",
      "avatar": "https://example.com/avatar.jpg",
      "gender": "male",
      "age": 25,
      "bio": "Love to chat and meet new people!",
      "isOnline": true,
      "lastSeen": "2026-01-22T22:00:00.000Z"
    }
  }
}
```

---

## 4.2 Update Profile
**Endpoint:** `PUT /api/users/profile`

**Headers:** `Authorization: Bearer <TOKEN>`

**Request Body:**
```json
{
  "username": "new_username",
  "bio": "Updated bio",
  "age": 26,
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "username": "new_username",
      "bio": "Updated bio",
      "age": 26,
      "avatar": "https://example.com/new-avatar.jpg"
    }
  }
}
```

---

# 5. Message APIs

## 5.1 Send Message
**Endpoint:** `POST /api/messages`

**Headers:** `Authorization: Bearer <TOKEN>`

**Request Body:**
```json
{
  "chatId": "chat_id",
  "content": "Hello! How are you?",
  "type": "text"
}
```

**Field Details:**
- `type`: "text", "image", "audio", "video"

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "message": {
      "_id": "message_id",
      "chatId": "chat_id",
      "sender": "user_id",
      "content": "Hello! How are you?",
      "type": "text",
      "isRead": false,
      "createdAt": "2026-01-22T22:00:00.000Z"
    }
  }
}
```

---

## 5.2 Get Messages
**Endpoint:** `GET /api/messages/:chatId`

**Headers:** `Authorization: Bearer <TOKEN>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Messages per page (default: 50)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "msg1",
        "sender": {
          "_id": "user1_id",
          "username": "User5678"
        },
        "content": "Hello!",
        "type": "text",
        "isRead": true,
        "createdAt": "2026-01-22T22:00:00.000Z"
      },
      {
        "_id": "msg2",
        "sender": {
          "_id": "user2_id",
          "username": "abhay_patel"
        },
        "content": "Hi! How are you?",
        "type": "text",
        "isRead": false,
        "createdAt": "2026-01-22T22:01:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

---

## 5.3 Mark Message as Read
**Endpoint:** `PUT /api/messages/:messageId/read`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

---

## 5.4 Delete Message
**Endpoint:** `DELETE /api/messages/:messageId`

**Headers:** `Authorization: Bearer <TOKEN>`

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

# Error Handling

## Standard Error Response Format
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error (only in development)"
}
```

## Common HTTP Status Codes

| Status Code | Meaning | Example |
|------------|---------|---------|
| 200 | Success | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

## Flutter Error Handling Example
```dart
Future<void> makeApiCall() async {
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/endpoint'),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    final data = jsonDecode(response.body);
    
    if (response.statusCode == 200) {
      // Success
      print(data['data']);
    } else if (response.statusCode == 401) {
      // Token expired, redirect to login
      navigateToLogin();
    } else if (response.statusCode == 400) {
      // Show error message
      showSnackbar(data['message']);
    } else {
      // Generic error
      showSnackbar('Something went wrong');
    }
  } catch (e) {
    print('Network error: $e');
    showSnackbar('Network error. Please check your connection.');
  }
}
```

---

# 💡 Important Notes for Flutter Developers

## 1. Token Management
```dart
// Token save કરો
await storage.write(key: 'auth_token', value: token);

// Token read કરો
final token = await storage.read(key: 'auth_token');

// Token delete કરો (logout time)
await storage.delete(key: 'auth_token');
```

## 2. Device ID Generation
```dart
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

Future<String> getDeviceId() async {
  final deviceInfo = DeviceInfoPlugin();
  
  if (defaultTargetPlatform == TargetPlatform.android) {
    final androidInfo = await deviceInfo.androidInfo;
    return androidInfo.id; // Android ID
  } else if (defaultTargetPlatform == TargetPlatform.iOS) {
    final iosInfo = await deviceInfo.iosInfo;
    return iosInfo.identifierForVendor ?? '';
  }
  
  return 'unknown';
}
```

## 3. Coin Economy Summary

| Action | Coins |
|--------|-------|
| Guest Signup | +50 |
| Full Registration | +150 |
| Upgrade Bonus | +50 |
| Daily Bonus | +10 |
| Watch Ad | +10 |
| Referral (Referrer gets) | +25 |
| Send Request (Base) | -10 |
| Send Request (with filters) | -15 |
| Extend Chat 24h | -50 |
| Extend Chat 48h | -90 |

## 4. Chat Expiry Logic
- Pool requests expire in: **60 minutes**
- Random chats expire in: **24 hours**
- Extended chats: **+24h or +48h**
- Backend automatically deletes expired chats (TTL index)

## 5. Real-time Updates (Socket.IO)
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io('https://your-api-domain.com', <String, dynamic>{
  'transports': ['websocket'],
  'auth': {'token': 'your_jwt_token'}
});

socket.on('connect', (_) {
  print('Connected to socket');
  socket.emit('join_chat', {'chatId': 'your_chat_id'});
});

socket.on('new_message', (data) {
  print('New message: $data');
  // Update UI
});

socket.on('disconnect', (_) => print('Disconnected'));
```

---

# 📞 Support

કોઈ પણ doubt હોય તો backend developer ને contact કરો.

**Happy Coding! 🚀**
