# App Config/Init API Documentation

## Overview
This API provides all necessary initialization data when a user opens the app with an existing authentication token. Instead of making multiple API calls, this single endpoint returns everything needed to initialize the app.

## Endpoint

**GET** `/nearbychatapi/v1/users/config`

## Authentication
**Required**: Yes (JWT Bearer Token)

## Use Case
Call this API when:
- ✅ User opens the app and already has a valid token
- ✅ App starts and needs to load user data
- ✅ Need to refresh user profile and app settings
- ✅ After login to get complete user context

## Request

### Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### No Request Body Required
This is a GET request, no body needed.

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "App configuration loaded successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "gender": "male",
      "age": 25,
      "avatar": "/uploads/avatars/avatar.jpg",
      "bio": "Love to travel and explore",
      "location": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749],
        "address": "San Francisco, CA"
      },
      "isOnline": true,
      "lastSeen": "2026-01-26T17:00:00.000Z",
      "isEmailVerified": true,
      "isPhoneVerified": true,
      "isGuest": false,
      "coins": 250,
      "referralCode": "JOHN1234",
      "settings": {
        "showOnlineStatus": true,
        "showLocation": true,
        "allowNearbyUsers": true,
        "notifications": {
          "messages": true,
          "groups": true,
          "nearbyUsers": true
        }
      },
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-26T17:00:00.000Z"
    },
    "appSettings": {
      "coin.send_request": 10,
      "coin.age_filter_extra": 5,
      "coin.extend_chat_24h": 50,
      "coin.extend_chat_48h": 90,
      "coin.text_message": 0,
      "coin.image_message": 2,
      "reward.guest_signup": 50,
      "reward.full_signup": 150,
      "reward.ad_watch": 10,
      "reward.daily_bonus": 5,
      "feature.guest_login": true,
      "feature.random_chat": true,
      "limit.chat_expiry_hours": 24,
      "limit.pool_expiry_minutes": 60
    },
    "stats": {
      "totalChats": 15,
      "unreadMessages": 8,
      "coinBalance": 250
    },
    "recentTransactions": [
      {
        "type": "spend",
        "amount": -10,
        "reason": "Initiated random chat request",
        "createdAt": "2026-01-26T16:30:00.000Z"
      },
      {
        "type": "earn",
        "amount": 10,
        "reason": "Watched advertisement",
        "createdAt": "2026-01-26T15:00:00.000Z"
      }
    ],
    "features": {
      "guestLogin": true,
      "randomChat": true
    },
    "coinPrices": {
      "sendRequest": 10,
      "ageFilter": 5,
      "extendChat24h": 50,
      "extendChat48h": 90,
      "textMessage": 0,
      "imageMessage": 2
    },
    "rewards": {
      "guestSignup": 50,
      "fullSignup": 150,
      "adWatch": 10,
      "dailyBonus": 5
    },
    "limits": {
      "chatExpiryHours": 24,
      "poolExpiryMinutes": 60
    }
  }
}
```

### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "User not found"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Error loading app configuration",
  "error": "Error details here"
}
```

## Response Data Breakdown

### 1. User Object
Complete user profile information including:
- Personal details (username, email, phone, gender, age)
- Profile data (avatar, bio, location)
- Status (online, last seen, verification status)
- Coins balance and referral code
- User settings and preferences
- Timestamps

### 2. App Settings
All dynamic app configuration from database:
- Coin prices for various actions
- Reward amounts
- Feature toggles
- System limits

### 3. Stats
Quick statistics for the user:
- **totalChats**: Number of active chats
- **unreadMessages**: Total unread message count across all chats
- **coinBalance**: Current coin balance

### 4. Recent Transactions
Last 5 coin transactions (most recent first):
- Transaction type (earn, spend, bonus, refund)
- Amount (positive for earn, negative for spend)
- Reason/description
- Timestamp

### 5. Features
Boolean flags for enabled features:
- Guest login enabled/disabled
- Random chat enabled/disabled

### 6. Coin Prices
Structured coin pricing for easy access:
- Send request cost
- Age filter extra cost
- Chat extension costs
- Message costs

### 7. Rewards
Structured reward amounts:
- Signup bonuses
- Ad watch rewards
- Daily bonuses

### 8. Limits
System limits and constraints:
- Chat expiry time
- Pool expiry time

## Usage Examples

### Using cURL
```bash
curl -X GET http://localhost:5000/nearbychatapi/v1/users/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Using JavaScript (Fetch)
```javascript
fetch('http://localhost:5000/nearbychatapi/v1/users/config', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('User:', data.data.user);
  console.log('Stats:', data.data.stats);
  console.log('Coin Balance:', data.data.user.coins);
})
.catch(error => console.error('Error:', error));
```

### Using Axios
```javascript
const axios = require('axios');

axios.get('http://localhost:5000/nearbychatapi/v1/users/config', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => {
  const { user, stats, coinPrices } = response.data.data;
  console.log(`Welcome ${user.username}!`);
  console.log(`You have ${stats.unreadMessages} unread messages`);
  console.log(`Coin balance: ${user.coins}`);
})
.catch(error => {
  console.error('Error:', error.response?.data || error.message);
});
```

### React Example
```javascript
import { useEffect, useState } from 'react';

function App() {
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAppConfig = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch('/nearbychatapi/v1/users/config', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          setAppData(data.data);
          // Store user data in state/context
          // Initialize app with settings
        }
      } catch (error) {
        console.error('Failed to load app config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppConfig();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome {appData?.user?.username}!</h1>
      <p>Coins: {appData?.user?.coins}</p>
      <p>Unread Messages: {appData?.stats?.unreadMessages}</p>
      <p>Total Chats: {appData?.stats?.totalChats}</p>
    </div>
  );
}
```

## Best Practices

### 1. Call on App Start
```javascript
// When app starts and token exists
if (hasValidToken()) {
  loadAppConfig();
}
```

### 2. Cache the Data
```javascript
// Store in local state/context
const [userConfig, setUserConfig] = useState(null);

// Use throughout the app
const coinBalance = userConfig?.user?.coins;
const unreadCount = userConfig?.stats?.unreadMessages;
```

### 3. Refresh Periodically
```javascript
// Refresh every 5 minutes
setInterval(() => {
  loadAppConfig();
}, 5 * 60 * 1000);
```

### 4. Update After Actions
```javascript
// After sending a message, buying coins, etc.
await sendMessage();
await loadAppConfig(); // Refresh to get updated coin balance
```

## Benefits

✅ **Single API Call**: Get all initialization data at once
✅ **Reduced Network Calls**: No need for multiple separate requests
✅ **Complete Context**: Everything needed to start the app
✅ **Fresh Data**: Always get latest user info and settings
✅ **Performance**: Faster app initialization
✅ **Consistency**: All data from single source at same time

## When to Use

### ✅ DO Use This API When:
- App starts with existing token
- User returns to app after being away
- Need to refresh user profile
- After login/signup
- Periodically to keep data fresh

### ❌ DON'T Use This API When:
- User is not logged in
- Token is expired
- Only need specific user data (use specific endpoints instead)

## Related APIs

- **Login**: `POST /nearbychatapi/v1/auth/login`
- **Get Profile**: `GET /nearbychatapi/v1/users/profile/:userId`
- **Update Profile**: `PUT /nearbychatapi/v1/users/profile`
- **Get Chats**: `GET /nearbychatapi/v1/chats`

## Troubleshooting

### Token Expired
If you get 401 error, token might be expired. Ask user to login again.

### User Not Found
If you get 404 error, the user account might have been deleted. Clear local data and redirect to login.

### Slow Response
This API fetches data from multiple sources. Normal response time is 200-500ms.

## Security Notes

⚠️ **Never expose the token**: Always store securely
⚠️ **HTTPS only**: Use HTTPS in production
⚠️ **Token expiry**: Implement token refresh mechanism
⚠️ **Sensitive data**: Password is never returned in response

---

**API Version**: 1.0  
**Last Updated**: 2026-01-26
