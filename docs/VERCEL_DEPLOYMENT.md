# Vercel Deployment Guide

## 🚀 Quick Start

Your application is now configured to work on Vercel! Here's what you need to know:

## 📁 Project Structure for Vercel

```
near-by-chat/
├── api/
│   └── index.js          # Vercel serverless function (entry point)
├── server.js             # Local development server (with WebSocket)
├── vercel.json           # Vercel configuration
└── ... (rest of your files)
```

## ⚙️ How It Works

### Local Development (npm start)
- Uses `server.js`
- Full WebSocket support via Socket.IO
- Files saved to `public/uploads/`
- Traditional Node.js server on port 5000

### Vercel Deployment
- Uses `api/index.js`
- **No WebSocket support** (serverless limitation)
- Files saved to `/tmp/uploads/` (temporary)
- Serverless functions handle HTTP requests

## 🚨 Important Limitations on Vercel

### 1. **No WebSocket Support**
Vercel serverless functions **do not support WebSockets**. Your Socket.IO features will NOT work on Vercel.

**Solutions:**
- Use **Vercel Edge Functions** (limited support)
- Deploy WebSocket server separately (e.g., Railway, Render, Heroku)
- Use **Pusher**, **Ably**, or **Firebase** for real-time features
- Use **HTTP polling** as a fallback

### 2. **Temporary File Storage**
Files uploaded to `/tmp/` are deleted when the serverless function ends.

**Solutions:**
- Integrate cloud storage (see below)

### 3. **10-Second Timeout**
Serverless functions timeout after 10 seconds (50 seconds on Pro plan).

## 📦 Deployment Steps

### Step 1: Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### Step 2: Configure Environment Variables

Add these to your Vercel project dashboard:

```env
# Database
nearbychat_MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string

# JWT
JWT_SECRET=your_jwt_secret

# Client
CLIENT_URL=https://your-frontend-url.vercel.app

# Node Environment
NODE_ENV=production
```

### Step 3: Deploy

#### Option A: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect settings
6. Click "Deploy"

#### Option B: Vercel CLI
```bash
vercel
```

Follow the prompts and your app will be deployed!

### Step 4: Verify Deployment

Visit your deployment URL:
```
https://your-project.vercel.app/health
```

You should see:
```json
{
  "status": "OK",
  "timestamp": "2026-01-21T...",
  "uptime": 123.456,
  "environment": "production"
}
```

## 🔧 Configuration Files

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/uploads/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/health",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

### api/index.js
This is the serverless entry point that:
- Exports the Express app
- Initializes database connections lazily
- Handles all HTTP routes
- Does NOT include Socket.IO

## ☁️ Cloud Storage Integration (Recommended)

### Option 1: Vercel Blob Storage

**Install:**
```bash
npm install @vercel/blob
```

**Update `middleware/upload.middleware.js`:**
```javascript
const { put } = require('@vercel/blob');

if (isVercel) {
    const uploadToBlob = async (req, res, next) => {
        if (req.file) {
            const blob = await put(
                `${Date.now()}-${req.file.originalname}`,
                req.file.buffer,
                { access: 'public' }
            );
            req.file.url = blob.url;
        }
        next();
    };
}
```

**Environment Variables:**
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

### Option 2: AWS S3

**Install:**
```bash
npm install @aws-sdk/client-s3 multer-s3
```

**Environment Variables:**
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket
```

### Option 3: Cloudinary

**Install:**
```bash
npm install cloudinary multer-storage-cloudinary
```

**Environment Variables:**
```env
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## 🔌 WebSocket Alternative Solutions

Since Vercel doesn't support WebSockets, here are your options:

### Option 1: Separate WebSocket Server

Deploy your WebSocket server to a platform that supports it:

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Render:**
1. Create a new Web Service
2. Connect your GitHub repo
3. Use `server.js` as entry point
4. Deploy

**Heroku:**
```bash
heroku create your-app-name
git push heroku main
```

### Option 2: Use a Real-time Service

**Pusher:**
```bash
npm install pusher
```

**Ably:**
```bash
npm install ably
```

**Firebase:**
```bash
npm install firebase-admin
```

### Option 3: HTTP Polling (Fallback)

Implement polling in your frontend:
```javascript
// Poll for new messages every 5 seconds
setInterval(async () => {
    const response = await fetch('/api/messages/new');
    const data = await response.json();
    // Update UI
}, 5000);
```

## 🧪 Testing

### Local Testing
```bash
npm start
# Visit http://localhost:5000/health
```

### Vercel Testing
```bash
vercel dev
# Visit http://localhost:3000/health
```

## 📊 Monitoring

### View Logs
```bash
vercel logs
```

### View Deployments
```bash
vercel ls
```

## 🐛 Troubleshooting

### "Invalid export found in module"
✅ **Fixed!** The `api/index.js` now properly exports the Express app.

### "ENOENT: no such file or directory"
✅ **Fixed!** The app now uses `/tmp/` on Vercel.

### WebSocket not working
⚠️ **Expected!** Deploy WebSocket server separately or use alternatives.

### Database connection timeout
- Check your MongoDB allows connections from Vercel IPs
- Use MongoDB Atlas with IP whitelist: `0.0.0.0/0`
- Increase connection timeout in `config/database.js`

### Files disappearing
- This is expected with `/tmp/` storage
- Integrate cloud storage (see above)

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [WebSocket Alternatives](https://vercel.com/guides/do-vercel-serverless-functions-support-websocket-connections)

## 🎯 Recommended Architecture

For production, we recommend:

```
┌─────────────────┐
│   Frontend      │
│   (Vercel)      │
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
┌────────▼────────┐ ┌──────▼──────┐  ┌────────▼────────┐
│   REST API      │ │  WebSocket  │  │  File Storage   │
│   (Vercel)      │ │  (Railway)  │  │  (Vercel Blob)  │
└─────────────────┘ └─────────────┘  └─────────────────┘
         │                  │
         └──────────┬───────┘
                    │
         ┌──────────▼──────────┐
         │   MongoDB Atlas     │
         │   Redis Cloud       │
         └─────────────────────┘
```

This gives you:
- ✅ Scalable REST API on Vercel
- ✅ Real-time WebSocket on Railway/Render
- ✅ Persistent file storage
- ✅ Managed databases

## 🚀 Next Steps

1. ✅ Deploy to Vercel (REST API only)
2. 🔄 Set up cloud storage (Vercel Blob recommended)
3. 🔄 Deploy WebSocket server separately (Railway/Render)
4. 🔄 Update frontend to connect to both endpoints
5. 🔄 Set up monitoring and logging
6. 🔄 Configure custom domain

---

**Need help?** Check the [Vercel Community](https://github.com/vercel/vercel/discussions) or [Discord](https://vercel.com/discord)


Vercel is a **serverless platform** with a read-only filesystem. This means:

- ❌ You **cannot** write files to `/var/task/` or any deployment directory
- ✅ You **can** write to `/tmp/` directory temporarily
- ⚠️ Files in `/tmp/` are **ephemeral** and will be deleted when the serverless function ends

## Current Implementation

The application now automatically detects Vercel environment and uses:
- **Local Development**: `public/uploads/` (persistent)
- **Vercel Deployment**: `/tmp/uploads/` (temporary)

### Detection Logic
```javascript
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION;
```

## ⚠️ Important Warning

**Files uploaded to `/tmp/` on Vercel are NOT persistent!** They will be deleted after:
- The serverless function completes
- The container is recycled (usually within minutes)
- A new deployment is made

## Recommended Solution: Use Cloud Storage

For production deployments on Vercel, you should integrate a cloud storage service:

### Option 1: Vercel Blob Storage (Recommended for Vercel)
```bash
npm install @vercel/blob
```

```javascript
import { put } from '@vercel/blob';

const blob = await put('avatar.png', file, {
  access: 'public',
});
console.log(blob.url); // https://your-blob-url.vercel-storage.com/avatar.png
```

### Option 2: AWS S3
```bash
npm install @aws-sdk/client-s3 multer-s3
```

### Option 3: Cloudinary
```bash
npm install cloudinary multer-storage-cloudinary
```

### Option 4: Google Cloud Storage
```bash
npm install @google-cloud/storage multer-cloud-storage
```

## Migration Steps

1. Choose a cloud storage provider
2. Install the required packages
3. Update `middleware/upload.middleware.js` to use cloud storage when on Vercel
4. Update environment variables in Vercel dashboard
5. Test the upload functionality

## Example: Vercel Blob Integration

```javascript
// middleware/upload.middleware.js
const { put } = require('@vercel/blob');

// For Vercel, upload directly to Blob Storage
if (isVercel) {
    const upload = multer({
        storage: multer.memoryStorage(), // Store in memory temporarily
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: fileFilter
    });
    
    // After multer processes the file, upload to Vercel Blob
    const uploadToBlob = async (req, res, next) => {
        if (req.file) {
            const blob = await put(req.file.originalname, req.file.buffer, {
                access: 'public',
            });
            req.file.url = blob.url; // Store the blob URL
        }
        next();
    };
    
    module.exports = { upload, uploadToBlob };
}
```

## Environment Variables

Add these to your Vercel project:

```env
# For Vercel Blob
BLOB_READ_WRITE_TOKEN=your_token_here

# For AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket

# For Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## Testing

1. **Local**: Files will be saved to `public/uploads/`
2. **Vercel**: Files will be saved to `/tmp/uploads/` (temporary) or cloud storage (persistent)

## References

- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Serverless Functions Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#limits)
- [AWS S3 with Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-creating-buckets.html)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
