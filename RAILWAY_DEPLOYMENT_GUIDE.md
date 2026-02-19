# 🚂 Railway.app Deployment Guide for Socket.IO

## Why Railway?
- ✅ **FREE** tier available
- ✅ Supports **WebSockets** & Socket.IO
- ✅ Auto-deploys from GitHub
- ✅ Easy environment variables
- ✅ No credit card required for free tier

---

## 📋 Deployment Steps

### 1. Create Railway Account
1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign up with **GitHub**

### 2. Deploy Your Project
1. Click **"Deploy from GitHub repo"**
2. Select your repository: `abhikaneriya18/near-by-chat`
3. Railway will auto-detect it's a Node.js app
4. Click **"Deploy Now"**

### 3. Add Environment Variables
Click on your project → **Variables** tab → Add these:

```env
NODE_ENV=production
PORT=5000
nearbychat_MONGODB_URI=mongodb+srv://Vercel-Admin-near-by-chat:2nMiZd1GmSYqu13x@near-by-chat.yqwsns4.mongodb.net/?retryWrites=true&w=majority
REDIS_URL=redis://default:eBgalFW1n1FN9bIyM7mLndFhPTzJECUJ@redis-10626.crce217.ap-south-1-1.ec2.cloud.redislabs.com:10626
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d
CLIENT_URL=*
```

### 4. Get Your Railway URL
After deployment, Railway will give you a URL like:
```
https://near-by-chat-production.up.railway.app
```

### 5. Update Flutter App
Use this URL in your Flutter code:
```dart
const String socketUrl = "https://near-by-chat-production.up.railway.app";
```

---

## 🎯 Architecture After Deployment

```
Flutter App
    ↓
    ├─→ REST APIs → Vercel (https://near-by-chat-three.vercel.app)
    │
    └─→ Socket.IO → Railway (https://your-app.railway.app)
```

---

## ✅ Verification

After deployment, test your Socket.IO connection:

1. **Check Health Endpoint:**
   ```bash
   curl https://your-app.railway.app/health
   ```

2. **Test Socket.IO:**
   Open: `https://your-app.railway.app/socket-test.html`

---

## 💰 Cost

- **Railway Free Tier:** $5 credit/month (enough for development)
- **After free tier:** ~$5-10/month for small apps

---

## 🔄 Auto-Deploy

Railway automatically deploys when you push to GitHub:
```bash
git add .
git commit -m "Update socket code"
git push origin main
```
Railway will auto-deploy! 🚀

---

## 🆚 Alternative: Render.com

If you prefer Render.com:

1. Go to https://render.com
2. Create **New Web Service**
3. Connect GitHub repo
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add environment variables
7. Deploy!

---

## 📱 Flutter Configuration

Create environment-based URLs:

```dart
class SocketConfig {
  static const bool isProduction = true; // Change to false for local testing
  
  static String get socketUrl {
    if (isProduction) {
      return "https://your-app.railway.app"; // Railway URL
    } else {
      return "http://10.56.184.12:5000"; // Local server
    }
  }
  
  static String get apiUrl {
    if (isProduction) {
      return "https://near-by-chat-three.vercel.app"; // Vercel URL
    } else {
      return "http://10.56.184.12:5000"; // Local server
    }
  }
}

// Usage:
final socket = IO.io(SocketConfig.socketUrl, options);
```

---

## 🐛 Troubleshooting

### Issue: 404 on Railway
**Solution:** Check that `index.js` is in root directory

### Issue: Environment variables not working
**Solution:** Restart the Railway service after adding variables

### Issue: Socket connects but disconnects immediately
**Solution:** Check JWT_SECRET is same in both Railway and your auth system

---

## 🎉 Success!

Once deployed to Railway:
- ✅ Socket.IO will work perfectly
- ✅ No 404 errors
- ✅ Real-time features enabled
- ✅ Production-ready!

---

**Made with ❤️ for Nearby Chat**
