# Folder Structure Comparison

## Before Migration

```
near-by-chat-github/
├── api/
│   └── index.js (full Express app with all middleware and routes)
├── config/
│   ├── constants.js
│   ├── database.js
│   └── redis.js
├── controllers/
│   ├── auth.controller.js
│   ├── chat.controller.js
│   ├── coin.controller.js
│   ├── group.controller.js
│   ├── message.controller.js
│   └── user.controller.js
├── docs/
├── middleware/
│   ├── auth.middleware.js
│   ├── upload.middleware.js
│   └── validate.middleware.js
├── models/
│   ├── Chat.model.js
│   ├── Message.model.js
│   ├── MessagePool.model.js
│   ├── OTP.model.js
│   ├── Settings.model.js
│   └── User.model.js
├── public/
│   └── uploads/
├── routes/
│   ├── auth.routes.js
│   ├── chat.routes.js
│   ├── coin.routes.js
│   ├── group.routes.js
│   ├── message.routes.js
│   └── user.routes.js
├── scripts/
├── socket/
│   └── socketHandler.js
├── utils/
├── package.json
├── server.js (main entry point)
└── vercel.json
```

## After Migration (PropertyApp Style)

```
near-by-chat-github/
├── api/
│   ├── index.js (simple router to v1)
│   └── v1/
│       ├── index.js (main v1 router)
│       ├── auth/
│       │   ├── controller.js
│       │   └── routes.js
│       ├── chats/
│       │   ├── controller.js
│       │   └── routes.js
│       ├── coins/
│       │   ├── controller.js
│       │   └── routes.js
│       ├── groups/
│       │   ├── controller.js
│       │   └── routes.js
│       ├── messages/
│       │   ├── controller.js
│       │   └── routes.js
│       └── users/
│           ├── controller.js
│           └── routes.js
├── config/
│   ├── constants.js
│   ├── database.js
│   └── redis.js
├── docs/
├── middleware/
│   ├── auth.middleware.js
│   ├── upload.middleware.js
│   └── validate.middleware.js
├── model/
│   ├── db/
│   ├── dbinit.js (database connection class)
│   ├── index.js (centralized model exports)
│   ├── Chat.model.js
│   ├── Message.model.js
│   ├── MessagePool.model.js
│   ├── OTP.model.js
│   ├── Settings.model.js
│   └── User.model.js
├── public/
│   └── uploads/
├── scripts/
├── socket/
│   └── socketHandler.js
├── utils/
├── package.json (updated)
├── index.js (main entry point - renamed from server.js)
├── MIGRATION_GUIDE.md (this file)
└── vercel.json
```

## Key Differences

### 1. API Organization
- **Before**: Separate `controllers/` and `routes/` folders
- **After**: Each feature has its own folder with both controller and routes

### 2. Versioning
- **Before**: No API versioning
- **After**: API is versioned under `v1/`

### 3. Models
- **Before**: `models/` folder
- **After**: `model/` folder with `dbinit.js` and `index.js`

### 4. Entry Point
- **Before**: `server.js`
- **After**: `index.js`

### 5. API Base Path
- **Before**: `/api/`
- **After**: `/nearbychatapi/v1/`

## Advantages of New Structure

1. **Feature-based organization**: Each API feature is self-contained
2. **Easier navigation**: Related files are grouped together
3. **Better scalability**: Easy to add new features or versions
4. **Consistent with PropertyApp**: Easier to maintain multiple projects
5. **Clear separation**: API logic is clearly separated by version and feature
