# 🚀 App Config API - Quick Reference

## What is this?

એક single API call જે app start થતી વખતે બધો જરૂરી data આપે છે.

## Endpoint

```
GET /nearbychatapi/v1/users/config
```

## When to Call?

✅ **App start થતી વખતે** (જ્યારે user પહેલેથી logged in હોય)  
✅ **Login પછી**  
✅ **Data refresh કરવા માટે**

## What You Get?

### 1️⃣ User Data
```javascript
{
  id, username, email, phone, gender, age,
  avatar, bio, location, coins, referralCode,
  settings, isOnline, lastSeen, etc.
}
```

### 2️⃣ App Settings
```javascript
{
  coin prices, rewards, features, limits
}
```

### 3️⃣ Stats
```javascript
{
  totalChats: 15,
  unreadMessages: 8,
  coinBalance: 250
}
```

### 4️⃣ Recent Transactions
```javascript
[
  { type: "spend", amount: -10, reason: "..." },
  { type: "earn", amount: 10, reason: "..." }
]
```

## Quick Usage

### JavaScript
```javascript
const response = await fetch('/nearbychatapi/v1/users/config', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();

console.log(data.user.username);        // User name
console.log(data.user.coins);           // Coin balance
console.log(data.stats.unreadMessages); // Unread count
console.log(data.stats.totalChats);     // Total chats
```

### React Hook
```javascript
function useAppConfig() {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    fetch('/nearbychatapi/v1/users/config', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setConfig(data.data));
  }, []);
  
  return config;
}

// Usage
function App() {
  const config = useAppConfig();
  
  return (
    <div>
      <h1>Welcome {config?.user?.username}!</h1>
      <p>Coins: {config?.user?.coins}</p>
      <p>Unread: {config?.stats?.unreadMessages}</p>
    </div>
  );
}
```

## Response Structure

```json
{
  "success": true,
  "message": "App configuration loaded successfully",
  "data": {
    "user": { ... },           // Complete user profile
    "appSettings": { ... },    // All app settings
    "stats": { ... },          // Quick stats
    "recentTransactions": [],  // Last 5 transactions
    "features": { ... },       // Feature flags
    "coinPrices": { ... },     // Coin pricing
    "rewards": { ... },        // Reward amounts
    "limits": { ... }          // System limits
  }
}
```

## Benefits

✅ **Single API call** - બધો data એક જ વાર માં  
✅ **Fast** - App જલ્દી start થાય  
✅ **Complete** - બધી જરૂરી information  
✅ **Fresh** - Latest data મળે  

## Common Use Cases

### 1. App Initialization
```javascript
async function initializeApp() {
  const config = await getAppConfig();
  
  // Set user in state
  setUser(config.user);
  
  // Show unread badge
  setBadgeCount(config.stats.unreadMessages);
  
  // Initialize settings
  applySettings(config.appSettings);
}
```

### 2. Dashboard Display
```javascript
function Dashboard({ config }) {
  return (
    <div>
      <UserCard user={config.user} />
      <CoinBalance coins={config.user.coins} />
      <UnreadMessages count={config.stats.unreadMessages} />
      <ChatList total={config.stats.totalChats} />
    </div>
  );
}
```

### 3. Coin Display
```javascript
function CoinPricing({ config }) {
  return (
    <div>
      <p>Send Request: {config.coinPrices.sendRequest} coins</p>
      <p>Extend 24h: {config.coinPrices.extendChat24h} coins</p>
      <p>Image Message: {config.coinPrices.imageMessage} coins</p>
    </div>
  );
}
```

## Error Handling

```javascript
try {
  const response = await fetch('/nearbychatapi/v1/users/config', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired - redirect to login
      redirectToLogin();
    }
    throw new Error('Failed to load config');
  }
  
  const data = await response.json();
  return data.data;
  
} catch (error) {
  console.error('Config load error:', error);
  // Handle error
}
```

## Testing

### cURL
```bash
curl -X GET http://localhost:5000/nearbychatapi/v1/users/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Postman
1. Method: **GET**
2. URL: `http://localhost:5000/nearbychatapi/v1/users/config`
3. Headers: `Authorization: Bearer YOUR_TOKEN`
4. Send ✅

## Tips

💡 **Cache the data** - Store in state/context  
💡 **Refresh periodically** - Every 5 minutes  
💡 **Update after actions** - After spending coins  
💡 **Show loading state** - While fetching  

## Full Documentation

📚 See `docs/APP_CONFIG_API.md` for complete details

---

**Quick Start**: Just call this API after login and you get everything! 🎉
