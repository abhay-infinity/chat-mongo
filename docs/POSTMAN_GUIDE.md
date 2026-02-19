# 📮 Postman Collection - Usage Guide

## 🎯 Updated Collection Features

### ✨ New in This Version:
1. **Guest Login** - Instant login without registration
2. **Coin System** - Complete coin management
3. **Auto Token Management** - Login once, use everywhere
4. **Auto Variable Saving** - User ID, Chat ID, etc.

---

## 🚀 Quick Start

### Step 1: Import Collection

1. Open Postman
2. Click **Import**
3. Select: `Nearby_Chat_Complete.postman_collection.json`
4. Done! ✅

### Step 2: Start Testing

#### Option A: Guest Login (Fastest! ⚡)

1. Go to: `1. Authentication` → `Guest Login (NEW!) ⚡`
2. Click **Send**
3. ✅ Token automatically saved!
4. ✅ User ID automatically saved!
5. ✅ You get 100 free coins!

**Now you can test ANY endpoint!**

#### Option B: Register New User

1. Go to: `1. Authentication` → `Register User`
2. Click **Send**
3. ✅ Token automatically saved!
4. ✅ You get 150 coins!

---

## 💰 Testing Coin Features

### 1. Check Your Balance

Go to: `2. Coins (NEW!)` → `Get Coin Balance`

**Response:**
```json
{
  "success": true,
  "data": {
    "coins": 100,
    "recentTransactions": []
  }
}
```

### 2. Claim Daily Bonus

Go to: `2. Coins (NEW!)` → `Claim Daily Bonus`

**Response:**
```json
{
  "success": true,
  "message": "Daily bonus claimed! +10 coins",
  "data": {
    "coins": 110,
    "bonusAmount": 10
  }
}
```

### 3. Check Feature Prices

Go to: `2. Coins (NEW!)` → `Get Coin Prices`

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": {
      "sendImage": 2,
      "sendVideo": 5,
      "createGroup": 10,
      "sendLocation": 1,
      "voiceCall": 5,
      "videoCall": 10
    }
  }
}
```

### 4. View Transaction History

Go to: `2. Coins (NEW!)` → `Get Transaction History`

---

## 📊 Complete Testing Flow

### Flow 1: Guest User Journey

```
1. Guest Login ⚡
   ↓ (Token auto-saved)
2. Get Coin Balance (100 coins)
   ↓
3. Claim Daily Bonus (+10 coins)
   ↓
4. Update Location
   ↓
5. Get Nearby Users
   ↓
6. Create Private Chat
   ↓
7. Send Text Message (FREE)
   ↓
8. Upgrade to Full Account (+50 bonus)
   ↓
9. Create Group (10 coins)
```

### Flow 2: Full User Journey

```
1. Register User
   ↓ (Token auto-saved, 150 coins)
2. Claim Daily Bonus (+10 coins)
   ↓
3. Update Location
   ↓
4. Send Text Message (FREE)
   ↓
5. Send Image (2 coins)
   ↓
6. Create Group (10 coins)
```

---

## 🎯 Collection Structure

### 1. Authentication (8 endpoints)
- ✅ **Guest Login** - NEW! Instant start
- ✅ Register User - 150 coins
- ✅ Upgrade Guest - +50 bonus coins
- ✅ Login
- ✅ Get Current User
- ✅ Send OTP
- ✅ Verify OTP
- ✅ Logout

### 2. Coins (6 endpoints) - NEW! 💰
- ✅ Get Coin Balance
- ✅ Claim Daily Bonus - 10 coins/day
- ✅ Get Coin Prices
- ✅ Get Transaction History
- ✅ Add Coins (Admin)
- ✅ Deduct Coins

### 3. Users (8 endpoints)
- ✅ Get User Profile
- ✅ Update Profile
- ✅ Update Location
- ✅ Get Nearby Users
- ✅ Search Users
- ✅ Update Settings
- ✅ Block User
- ✅ Unblock User

### 4. Chats (6 endpoints)
- ✅ Get All Chats
- ✅ Create Private Chat
- ✅ Get Chat by ID
- ✅ Delete Chat
- ✅ Mute Chat
- ✅ Clear Unread Count

### 5. Messages (5 endpoints)
- ✅ Get Messages
- ✅ Send Text Message (FREE)
- ✅ Send Image (2 coins)
- ✅ Mark as Read
- ✅ Delete Message

### 6. Groups (5 endpoints)
- ✅ Create Group (10 coins, full account)
- ✅ Update Group
- ✅ Add Members
- ✅ Remove Member
- ✅ Leave Group

**Total: 38 endpoints!**

---

## 🔑 Auto-Managed Variables

The collection automatically manages these variables:

| Variable | Auto-Saved From | Used In |
|----------|----------------|---------|
| `authToken` | Login/Register/Guest Login | All authenticated endpoints |
| `userId` | Login/Register/Guest Login | User-specific endpoints |
| `chatId` | Create Chat | Chat & Message endpoints |
| `messageId` | Send Message | Message operations |
| `groupId` | Create Group | Group operations |
| `deviceId` | Auto-generated | Guest Login |

**You don't need to copy-paste anything!** ✨

---

## 💡 Pro Tips

### 1. Start with Guest Login
- Fastest way to test
- No email/phone needed
- 100 free coins
- Can upgrade later

### 2. Test Coin Features
- Check balance after each action
- Claim daily bonus
- View transaction history
- Test coin-based features

### 3. Use Auto-Saved Variables
- Token is saved automatically
- User ID is saved automatically
- Chat ID is saved automatically
- Just click and test!

### 4. Test Different Flows
- Guest → Upgrade → Full features
- Register → Use features
- Login → Continue session

---

## 🎨 Feature Costs

### Free Features:
- ✅ Text messages
- ✅ Update location
- ✅ Search users
- ✅ View nearby users
- ✅ Update profile

### Paid Features (Coins):
- 💰 Send Image - 2 coins
- 💰 Send Video - 5 coins
- 💰 Send Location - 1 coin
- 💰 Create Group - 10 coins
- 💰 Voice Call - 5 coins/min
- 💰 Video Call - 10 coins/min

---

## 🐛 Troubleshooting

### "No authentication token"
- Run Guest Login or Register first
- Token is auto-saved

### "Insufficient coins"
- Check balance: `Get Coin Balance`
- Claim daily bonus: `Claim Daily Bonus`
- Add coins: `Add Coins`

### "Requires full account"
- Guest users can't create groups
- Upgrade: `Upgrade Guest to Full Account`

### "Invalid token"
- Token expired (30 days)
- Login again

---

## 📝 Testing Checklist

### Authentication:
- [ ] Guest Login
- [ ] Check coin balance (100 coins)
- [ ] Claim daily bonus (+10 coins)
- [ ] Register new user (150 coins)
- [ ] Upgrade guest (+50 bonus)
- [ ] Login
- [ ] Get current user

### Coins:
- [ ] Get balance
- [ ] Claim daily bonus
- [ ] View prices
- [ ] View transactions
- [ ] Add coins
- [ ] Deduct coins

### Users:
- [ ] Update profile
- [ ] Update location
- [ ] Get nearby users
- [ ] Search users

### Chats & Messages:
- [ ] Create chat
- [ ] Send text (free)
- [ ] Send image (2 coins)
- [ ] Get messages
- [ ] Mark as read

### Groups:
- [ ] Create group (10 coins)
- [ ] Add members
- [ ] Send message
- [ ] Leave group

---

## 🎉 Summary

**New Features in Collection:**
1. ✅ Guest Login - Instant start
2. ✅ Coin System - Complete management
3. ✅ Auto Token - No copy-paste
4. ✅ Auto Variables - Everything saved
5. ✅ 38 Endpoints - All features

**How to Use:**
1. Import collection
2. Run Guest Login
3. Test any endpoint!

**All tokens and IDs are auto-managed! Just click and test! 🚀**

---

**File:** `Nearby_Chat_Complete.postman_collection.json`

**Import karjo ane testing shuru karo! 💪**
