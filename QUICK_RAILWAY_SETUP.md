# 🚂 Railway.app - 5 Minute Setup Guide

## 🎯 કેમ Railway?

### Vercel ની સમસ્યાઓ:
- ❌ Maximum 12 serverless functions (તમારી પાસે વધારે છે)
- ❌ WebSocket support નબળું
- ❌ 30 second timeout
- ❌ Socket.IO માટે યોગ્ય નથી

### Railway ના ફાયદા:
- ✅ **Unlimited functions** - કોઈ limit નથી
- ✅ **True WebSocket** - Perfect for Socket.IO
- ✅ **Free $5/month** credit
- ✅ **Auto-deploy** from GitHub
- ✅ **Better performance**

---

## 📋 5-Minute Deployment Steps

### Step 1: Railway Account બનાવો (1 minute)
1. Go to: **https://railway.app**
2. Click **"Login with GitHub"**
3. Authorize Railway

### Step 2: New Project બનાવો (1 minute)
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose: **`abhikaneriya18/near-by-chat`**
4. Click **"Deploy Now"**

Railway automatically detect કરશે કે આ Node.js project છે! 🎉

### Step 3: Environment Variables Add કરો (2 minutes)
Project માં જાઓ → **Variables** tab → Add these:

```env
NODE_ENV=production
PORT=5000

# MongoDB
nearbychat_MONGODB_URI=mongodb+srv://Vercel-Admin-near-by-chat:2nMiZd1GmSYqu13x@near-by-chat.yqwsns4.mongodb.net/?retryWrites=true&w=majority

# Redis
REDIS_URL=redis://default:eBgalFW1n1FN9bIyM7mLndFhPTzJECUJ@redis-10626.crce217.ap-south-1-1.ec2.cloud.redislabs.com:10626

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Client
CLIENT_URL=*
```

### Step 4: Get Your Railway URL (1 minute)
1. Go to **Settings** tab
2. Scroll to **Networking**
3. Click **"Generate Domain"**
4. Copy your URL: `https://near-by-chat-production.up.railway.app`

### Step 5: ✅ Done!
Railway automatically deploy કરી રહ્યું છે! 🚀

---

## 📱 Flutter માં Use કરો

Railway URL વાપરો:

```dart
Future<void> initConnection() async {
    if (isConnected) return;

    String? token = LocalStorage().getString(key: 'auth_token');
    if (token == null) {
      debugPrint("❌ Socket: No auth token found.");
      return;
    }

    // ✅ Railway URL (Replace with your actual URL)
    const String socketUrl = "https://near-by-chat-production.up.railway.app";

    debugPrint("🔄 Connecting to Socket: $socketUrl");

    _socket = IO.io(
      socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling']) // WebSocket first!
          .enableAutoConnect()
          .enableReconnection()
          .setAuth({'token': token})
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      debugPrint('✅ Socket Connected! ID: ${_socket!.id}');
      debugPrint('🚀 Transport: ${_socket!.io.engine?.transport?.name}');
    });

    _socket!.onConnectError((data) {
      debugPrint('❌ Connection Error: $data');
    });

    _socket!.onDisconnect((_) {
      debugPrint('⚠️ Disconnected');
    });
}
```

---

## 🧪 Test કરો

### 1. Health Check:
```bash
curl https://your-app.railway.app/health
```

### 2. Socket.IO Test Page:
```
https://your-app.railway.app/socket-test.html
```

---

## 💰 Cost

### Free Tier:
- **$5 credit/month** (free)
- Enough for development + small production
- ~500 hours/month

### After Free Tier:
- **~$5-10/month** for small apps
- Pay only for what you use

---

## 🔄 Auto-Deploy

Railway automatically deploy કરે છે જ્યારે તમે GitHub પર push કરો:

```bash
git add .
git commit -m "Update code"
git push origin main
```

Railway automatically detect કરશે અને deploy કરશે! 🚀

---

## 🆚 Comparison

| Feature | Vercel | Railway |
|---------|--------|---------|
| Function Limit | ❌ 12 max | ✅ Unlimited |
| WebSocket | ⚠️ Limited | ✅ Full support |
| Socket.IO | ⚠️ Polling only | ✅ WebSocket + Polling |
| Timeout | ❌ 30s | ✅ No limit |
| Free Tier | ✅ Yes | ✅ $5/month |
| Setup Time | 5 min | 5 min |
| Performance | Good | Better |

**Winner: Railway.app** 🏆

---

## 🎉 Summary

### તમારી સમસ્યા:
- Vercel: "No more than 12 Serverless Functions"
- તમારી પાસે 12+ API routes છે

### Solution:
- ✅ Railway.app use કરો
- ✅ કોઈ function limit નથી
- ✅ Better Socket.IO support
- ✅ 5 minutes માં deploy

---

## 📞 Next Steps

1. **હમણાં જ Railway.app પર જાઓ:** https://railway.app
2. **GitHub થી login કરો**
3. **Repository deploy કરો**
4. **Environment variables add કરો**
5. **URL copy કરો અને Flutter માં વાપરો**

---

**Made with ❤️ for Nearby Chat**

*Railway = No Limits, Better Performance, Same Price!* 🚀
