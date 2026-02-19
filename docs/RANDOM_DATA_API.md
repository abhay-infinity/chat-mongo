# Random Data Generation API

## Overview
This API endpoint generates random test data for the Near-by Chat application. When called, it creates:
- **200 random users** (one for each chat)
- **200 chats** (private conversations where **YOU** are a participant in all of them)
- **20,000 messages** (100 messages per chat)

**Important**: The authenticated user who calls this API will be included as a participant in **ALL 200 chats**. This means when you call the `GET /chats` endpoint, you will see all 200 generated chats in your chat list.

## Endpoint Details

### Generate Random Data
**POST** `/nearbychatapi/v1/chats/generate-random-data`

#### Authentication
Requires authentication token in the request header.

#### Headers
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

#### Request Body
No request body required.

#### Response

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Random data generated successfully! All chats include you as a participant.",
  "data": {
    "authenticatedUser": {
      "id": "507f1f77bcf86cd799439011",
      "username": "yourUsername",
      "email": "your@email.com"
    },
    "usersCreated": 200,
    "chatsCreated": 200,
    "messagesCreated": 20000,
    "summary": {
      "newUsersCreated": 200,
      "chatsWithYou": 200,
      "messagesPerChat": 100,
      "totalMessages": 20000,
      "note": "You are a participant in all 200 chats. Call GET /chats to see them."
    }
  }
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Error generating random data",
  "error": "Error details here"
}
```

## Generated Data Details

### Users
Each generated user includes:
- **Username**: Combination of first name, last name, and random number
- **Email**: `username@example.com`
- **Phone**: Random US phone number format
- **Password**: `password123` (hashed)
- **Gender**: Randomly selected from `male`, `female`, `other`
- **Age**: Random age between 18-70
- **Bio**: Random bio from predefined templates
- **Location**: Random coordinates (longitude, latitude)
- **Coins**: Random amount between 100-600
- **Verified**: Email and phone verified by default

**Note**: 200 new users are created. The authenticated user (you) is NOT counted in this number.

### Chats
Each generated chat includes:
- **Type**: Private chat
- **Participants**: **YOU** (authenticated user) + 1 random user
- **Random Chat Flag**: 50% chance of being marked as random chat
- **Unread Count**: Random unread count (0-10) for each participant
- **Last Message**: Reference to the most recent message

**Important**: You are a participant in ALL 200 chats, so when you call `GET /nearbychatapi/v1/chats`, you will see all of them.

### Messages
Each generated message includes:
- **Content**: Random message from 100+ predefined templates
- **Type**: 90% text messages, 10% media (image, video, audio, file, location)
- **Sender**: Alternates between the two chat participants
- **Read Status**: 70% chance of being read
- **Delivery Status**: All messages marked as delivered
- **Timestamps**: Messages spread over time (1 minute intervals)
- **Media**: For non-text messages, includes URL, filename, size, and MIME type
- **Location**: For location messages, includes coordinates and address

## Usage Examples

### Using cURL
```bash
curl -X POST http://localhost:5000/nearbychatapi/v1/chats/generate-random-data \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### Using Postman
1. Set method to **POST**
2. Enter URL: `http://localhost:5000/nearbychatapi/v1/chats/generate-random-data`
3. Go to **Headers** tab
   - Add `Authorization: Bearer YOUR_AUTH_TOKEN`
   - Add `Content-Type: application/json`
4. Click **Send**

### Using JavaScript (Fetch)
```javascript
fetch('http://localhost:5000/nearbychatapi/v1/chats/generate-random-data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_AUTH_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### Using Axios
```javascript
const axios = require('axios');

axios.post('http://localhost:5000/nearbychatapi/v1/chats/generate-random-data', {}, {
  headers: {
    'Authorization': 'Bearer YOUR_AUTH_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error('Error:', error);
});
```

## Console Output
During execution, the API logs progress to the console:
```
Starting random data generation...
✅ Authenticated user: yourUsername (507f1f77bcf86cd799439011)
Creating 200 random users...
Created 50/200 users...
Created 100/200 users...
Created 150/200 users...
Created 200/200 users...
All 200 users created successfully!
Creating 200 chats with 100 messages each...
All chats will include authenticated user: yourUsername
Created 20/200 chats with 2000 messages...
Created 40/200 chats with 4000 messages...
...
Created 200/200 chats with 20000 messages...
Random data generation completed!
```

## Performance Notes
- **Execution Time**: Approximately 1-3 minutes depending on server performance
- **Database Operations**: 20,400 total inserts (200 users + 200 chats + 20,000 messages)
- **Memory Usage**: Moderate - processes data in batches
- **Recommended**: Run during development/testing only, not in production

## Important Warnings
⚠️ **Warning**: This endpoint creates a large amount of test data. Use only in development/testing environments.

⚠️ **Database Impact**: Running this multiple times will create duplicate data. Consider clearing the database before running again.

⚠️ **Authentication Required**: You must be logged in to use this endpoint.

## Cleanup
To remove generated test data, you can:
1. Drop the collections manually in MongoDB
2. Use a database cleanup script
3. Restore from a backup taken before running the generator

## Sample Data Templates

### Message Templates (100+ variations)
- Greetings: "Hey! How are you doing?", "What's up?", "Nice to meet you!"
- Responses: "That sounds interesting!", "I totally agree with you."
- Questions: "What do you think about that?", "Have you tried this before?"
- Farewells: "Talk to you later!", "Have a great day!", "Take care!"
- And many more...

### User Bios (15 variations)
- "Love to travel and explore new places"
- "Coffee enthusiast ☕"
- "Tech geek and proud of it"
- "Adventure seeker 🌍"
- And more...

## Testing Scenarios
This generated data is perfect for testing:
- ✅ Chat list pagination
- ✅ Message loading and scrolling
- ✅ Search functionality
- ✅ User profiles
- ✅ Message filtering
- ✅ Performance under load
- ✅ UI/UX with realistic data
- ✅ Database query optimization

## Support
For issues or questions about this API, please contact the development team or create an issue in the project repository.
