# Vercel Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Files Created
- [x] `api/index.js` - Serverless entry point
- [x] `vercel.json` - Vercel configuration
- [x] `.vercelignore` - Exclude unnecessary files
- [x] `docs/VERCEL_DEPLOYMENT.md` - Deployment guide

### 2. Code Changes
- [x] `middleware/upload.middleware.js` - Detects Vercel environment, uses `/tmp/`
- [x] `server.js` - Works for local development with WebSocket

### 3. Environment Variables to Set in Vercel Dashboard

Go to: **Project Settings → Environment Variables**

```
nearbychat_MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### 4. Database Configuration

#### MongoDB Atlas
- [ ] Whitelist Vercel IPs: `0.0.0.0/0` (all IPs)
- [ ] Or use specific Vercel IP ranges
- [ ] Test connection string

#### Redis
- [ ] Use Redis Cloud or Upstash
- [ ] Whitelist Vercel IPs
- [ ] Test connection string

### 5. Deployment Steps

#### Option A: GitHub (Recommended)
1. [ ] Commit all changes
   ```bash
   git add .
   git commit -m "Configure for Vercel deployment"
   git push origin main
   ```

2. [ ] Go to [vercel.com/new](https://vercel.com/new)

3. [ ] Import your GitHub repository

4. [ ] Configure project:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `npm install`

5. [ ] Add environment variables (from step 3)

6. [ ] Click **Deploy**

#### Option B: Vercel CLI
1. [ ] Install Vercel CLI
   ```bash
   npm install -g vercel
   ```

2. [ ] Login
   ```bash
   vercel login
   ```

3. [ ] Deploy
   ```bash
   vercel
   ```

4. [ ] Follow prompts and add environment variables

### 6. Post-Deployment Verification

1. [ ] Visit health endpoint
   ```
   https://your-project.vercel.app/health
   ```
   Should return:
   ```json
   {
     "status": "OK",
     "timestamp": "...",
     "uptime": ...,
     "environment": "production"
   }
   ```

2. [ ] Test API endpoints
   ```bash
   # Register
   curl -X POST https://your-project.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","username":"testuser"}'

   # Login
   curl -X POST https://your-project.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

3. [ ] Check logs
   ```bash
   vercel logs
   ```

### 7. Known Limitations

⚠️ **WebSocket/Socket.IO will NOT work on Vercel**
- [ ] Deploy WebSocket server separately (Railway, Render, Heroku)
- [ ] Or use alternative real-time service (Pusher, Ably, Firebase)
- [ ] Update frontend to connect to separate WebSocket server

⚠️ **File uploads are temporary**
- [ ] Integrate Vercel Blob Storage
- [ ] Or use AWS S3, Cloudinary, etc.
- [ ] Update `middleware/upload.middleware.js`

### 8. Optional: Custom Domain

1. [ ] Go to Project Settings → Domains
2. [ ] Add your custom domain
3. [ ] Update DNS records as instructed
4. [ ] Update `CLIENT_URL` environment variable

### 9. Monitoring & Maintenance

- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Monitor function execution time
- [ ] Monitor database connections
- [ ] Set up alerts for errors

## 🚀 Quick Deploy Command

```bash
# Commit changes
git add .
git commit -m "Configure for Vercel deployment"
git push origin main

# Deploy via CLI (optional)
vercel --prod
```

## 📊 Deployment Status

- [ ] Initial deployment successful
- [ ] Environment variables configured
- [ ] Database connections working
- [ ] API endpoints tested
- [ ] File uploads working (with cloud storage)
- [ ] WebSocket alternative implemented
- [ ] Custom domain configured
- [ ] Monitoring set up

## 🆘 Troubleshooting

### Build fails
- Check `vercel logs`
- Verify all dependencies in `package.json`
- Check Node.js version compatibility

### Database connection fails
- Verify environment variables
- Check IP whitelist in MongoDB/Redis
- Test connection strings locally

### 404 errors
- Check `vercel.json` routes configuration
- Verify `api/index.js` exports correctly

### Function timeout
- Optimize database queries
- Add indexes to MongoDB collections
- Consider upgrading to Vercel Pro (50s timeout)

## 📚 Resources

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

---

**Last Updated:** 2026-01-21
