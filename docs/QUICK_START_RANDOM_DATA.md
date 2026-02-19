# Quick Start Guide: Random Data Generation

## What This Does

When you call the **Generate Random Data API**, it will:

1. ✅ Create **200 new random users**
2. ✅ Create **200 chats** where **YOU are a participant in ALL of them**
3. ✅ Generate **100 messages** in each chat (20,000 total messages)
4. ✅ All chats will appear in your chat list when you call `GET /chats`

## Step-by-Step Usage

### Step 1: Login to Get Your Token

First, you need to be authenticated. Login using your credentials:

```bash
POST /nearbychatapi/v1/auth/login
```

**Request Body:**
```json
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

Copy the `token` value - you'll need it for the next step.

### Step 2: Call the Random Data Generation API

```bash
POST /nearbychatapi/v1/chats/generate-random-data
Authorization: Bearer YOUR_TOKEN_HERE
```

**Using cURL:**
```bash
curl -X POST http://localhost:5000/nearbychatapi/v1/chats/generate-random-data \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Using Postman:**
1. Create a new POST request
2. URL: `http://localhost:5000/nearbychatapi/v1/chats/generate-random-data`
3. Headers:
   - `Authorization: Bearer YOUR_TOKEN_HERE`
   - `Content-Type: application/json`
4. Click **Send**

### Step 3: Wait for Completion

The API will take **1-3 minutes** to complete. You'll see progress in the server console:

```
✅ Authenticated user: yourUsername (507f...)
Creating 200 random users...
Created 50/200 users...
Created 100/200 users...
...
Creating 200 chats with 100 messages each...
All chats will include authenticated user: yourUsername
...
Random data generation completed!
```

### Step 4: View Your Chats

Once complete, call the get all chats API to see your 200 new chats:

```bash
GET /nearbychatapi/v1/chats
Authorization: Bearer YOUR_TOKEN_HERE
```

**Using cURL:**
```bash
curl -X GET http://localhost:5000/nearbychatapi/v1/chats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

You should see 200 chats where you are a participant!

## Example Response

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

## What You Can Do Next

After generating the data, you can:

1. **View All Chats**: `GET /nearbychatapi/v1/chats`
2. **View Specific Chat**: `GET /nearbychatapi/v1/chats/:chatId`
3. **Get Messages**: `GET /nearbychatapi/v1/messages/:chatId`
4. **Send New Messages**: `POST /nearbychatapi/v1/messages/:chatId`
5. **Delete Chats**: `DELETE /nearbychatapi/v1/chats/:chatId`

## Important Notes

⚠️ **You are in ALL chats**: Unlike the previous version, YOU (the authenticated user) are now a participant in all 200 generated chats.

⚠️ **Development Only**: This is for testing purposes only. Don't run in production!

⚠️ **Database Impact**: Running this multiple times will create more data. Consider clearing old test data first.

## Troubleshooting

### "Authenticated user not found"
- Make sure you're logged in and using a valid token
- Check that your token hasn't expired

### "Too many requests"
- Wait a minute and try again (rate limiting)

### API takes too long
- This is normal! It's creating 20,400 database records
- Expected time: 1-3 minutes
- Check server console for progress

### Can't see chats after generation
- Make sure you're using the same user account that called the generation API
- Try refreshing or calling `GET /chats` again
- Check that the API returned success

## Clean Up

To remove test data:
1. Use MongoDB Compass or CLI to drop collections
2. Or restore from a backup
3. Or manually delete chats/users via API

## Need Help?

Check the full documentation: `docs/RANDOM_DATA_API.md`
