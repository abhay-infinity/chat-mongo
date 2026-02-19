# 🏗️ Nearby Chat - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Client  │  Mobile App  │  Test Client  │  Postman         │
└────────┬─────────────┬────────────┬──────────────┬──────────────┘
         │             │            │              │
         └─────────────┴────────────┴──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   HTTP/HTTPS & WebSocket   │
         └─────────────┬──────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                      SERVER LAYER                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Express.js Server                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │   Helmet     │  │     CORS     │  │ Rate Limiter │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────┐         ┌──────────────────────────┐  │
│  │   REST API Routes   │         │   Socket.IO Handler      │  │
│  ├─────────────────────┤         ├──────────────────────────┤  │
│  │ • /api/auth         │         │ • message:send           │  │
│  │ • /api/users        │         │ • typing:start           │  │
│  │ • /api/chats        │         │ • chat:join              │  │
│  │ • /api/messages     │         │ • location:update        │  │
│  │ • /api/groups       │         │ • nearby:request         │  │
│  └──────────┬──────────┘         └────────────┬─────────────┘  │
│             │                                  │                 │
│  ┌──────────▼──────────────────────────────────▼─────────────┐ │
│  │                   Middleware Layer                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │ │
│  │  │   Auth   │  │  Upload  │  │ Validate │                │ │
│  │  └──────────┘  └──────────┘  └──────────┘                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Controllers Layer                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │   Auth   │  │   User   │  │   Chat   │  │  Message │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  ┌──────────┐                                              │ │
│  │  │  Group   │                                              │ │
│  │  └──────────┘                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                       │                    │
         ┌─────────────┴────────┐  ┌────────▼─────────┐
         │                      │  │                   │
┌────────▼────────┐  ┌──────────▼──▼────┐  ┌──────────▼─────────┐
│  DATABASE LAYER │  │   CACHE LAYER    │  │   STORAGE LAYER    │
├─────────────────┤  ├──────────────────┤  ├────────────────────┤
│                 │  │                  │  │                    │
│   MongoDB       │  │     Redis        │  │   File System      │
│                 │  │                  │  │                    │
│ ┌─────────────┐ │  │ ┌──────────────┐│  │ ┌────────────────┐ │
│ │ Users       │ │  │ │ User Status  ││  │ │ /uploads/      │ │
│ │ OTPs        │ │  │ │ Socket IDs   ││  │ │  - avatars/    │ │
│ │ Chats       │ │  │ │ Locations    ││  │ │  - messages/   │ │
│ │ Messages    │ │  │ │ Typing       ││  │ │  - groups/     │ │
│ └─────────────┘ │  │ │ Cache        ││  │ └────────────────┘ │
│                 │  │ └──────────────┘│  │                    │
│ Indexes:        │  │                  │  │                    │
│ • 2dsphere      │  │ Geospatial:      │  │                    │
│ • Text search   │  │ • GEORADIUS      │  │                    │
│ • Compound      │  │ • GEOADD         │  │                    │
└─────────────────┘  └──────────────────┘  └────────────────────┘
```

## Data Flow Diagrams

### 1. User Registration Flow
```
Client                Server              MongoDB           Redis
  │                     │                   │                │
  ├──Register Request──▶│                   │                │
  │                     ├──Hash Password───▶│                │
  │                     ├──Save User───────▶│                │
  │                     │◀──User Saved──────┤                │
  │                     ├──Generate OTP─────┤                │
  │                     ├──Save OTP────────▶│                │
  │                     ├──Generate JWT─────┤                │
  │◀──Token & User──────┤                   │                │
  │                     │                   │                │
```

### 2. Real-time Message Flow
```
Sender              Socket.IO           MongoDB           Redis         Receiver
  │                     │                   │                │              │
  ├──message:send──────▶│                   │                │              │
  │                     ├──Verify Auth─────▶│                │              │
  │                     ├──Save Message────▶│                │              │
  │                     │◀──Message Saved───┤                │              │
  │                     ├──Update Chat─────▶│                │              │
  │                     ├──Emit to Room─────┼────────────────┼─────────────▶│
  │                     ├──Cache Status────▶│                │              │
  │◀──Confirmation──────┤                   │                │              │
  │                     │                   │                │◀─message:new─┤
```

### 3. Location-Based User Discovery
```
Client              Server              MongoDB           Redis
  │                     │                   │                │
  ├──Update Location───▶│                   │                │
  │                     ├──Save to DB──────▶│                │
  │                     ├──Cache Location──▶│                │
  │                     │                   │                │
  ├──Get Nearby Users──▶│                   │                │
  │                     ├──Check Cache─────▶│                │
  │                     │◀──Cache Hit───────┤                │
  │                     │   (or)            │                │
  │                     ├──Geospatial Query▶│                │
  │                     │◀──Results─────────┤                │
  │◀──Nearby Users──────┤                   │                │
```

### 4. Socket.IO Connection Flow
```
Client              Socket.IO           MongoDB           Redis
  │                     │                   │                │
  ├──Connect (JWT)─────▶│                   │                │
  │                     ├──Verify Token────▶│                │
  │                     │◀──User Valid──────┤                │
  │                     ├──Set Online──────▶│                │
  │                     ├──Store Socket ID─▶│                │
  │                     ├──Join User Chats─▶│                │
  │◀──Connected─────────┤                   │                │
  │                     │                   │                │
  │                     ├──Broadcast Online─┼────────────────┼─▶All Users
  │                     │                   │                │
```

## Component Interaction Matrix

```
┌──────────────┬────────┬────────┬────────┬────────┬────────┐
│ Component    │ MongoDB│ Redis  │ Socket │ Express│ Client │
├──────────────┼────────┼────────┼────────┼────────┼────────┤
│ Auth         │   ✓    │   ✗    │   ✗    │   ✓    │   ✓    │
│ User Mgmt    │   ✓    │   ✓    │   ✗    │   ✓    │   ✓    │
│ Chat         │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
│ Messages     │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
│ Groups       │   ✓    │   ✗    │   ✓    │   ✓    │   ✓    │
│ Location     │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
│ Presence     │   ✓    │   ✓    │   ✓    │   ✗    │   ✓    │
│ File Upload  │   ✓    │   ✗    │   ✗    │   ✓    │   ✓    │
└──────────────┴────────┴────────┴────────┴────────┴────────┘
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                     │
│  • HTML5  • CSS3  • JavaScript  • Socket.IO Client      │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│  • Node.js  • Express.js  • Socket.IO Server            │
│  • JWT  • Bcrypt  • Multer  • Sharp                     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    BUSINESS LAYER                        │
│  • Controllers  • Middleware  • Validators              │
│  • Authentication  • Authorization  • File Handling     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                      DATA LAYER                          │
│  • MongoDB (Mongoose)  • Redis (ioredis)                │
│  • Geospatial Indexes  • TTL Indexes                    │
└─────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                       │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Network Security                              │
│  • HTTPS/TLS  • CORS  • Helmet Headers                  │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Application Security                          │
│  • Rate Limiting  • Input Validation  • Sanitization    │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Authentication                                 │
│  • JWT Tokens  • Password Hashing  • OTP Verification   │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Authorization                                  │
│  • Role-based Access  • Resource Ownership              │
├─────────────────────────────────────────────────────────┤
│  Layer 5: Data Security                                  │
│  • Encrypted Passwords  • Secure File Storage           │
└─────────────────────────────────────────────────────────┘
```

---

**This architecture ensures scalability, security, and real-time performance! 🚀**
