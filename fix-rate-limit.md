# Rate Limit Fix Guide

## 🚨 Issue Identified

The "Failed to fetch" error is caused by **rate limiting blocking CORS preflight requests**:

```
Rate limit exceeded for IP: ::1 on /api/verify-payment
📤 OPTIONS /api/verify-payment - Status: 429
```

## ✅ Fixes Applied

### 1. **Disabled Strict Rate Limiting in Development**
- Payment endpoints now use general rate limiting only
- Development: 1000 requests per 5 minutes (very lenient)
- Production: Still secure with 100 requests per 15 minutes

### 2. **CORS Preflight Protection**
- OPTIONS requests no longer hit payment rate limits
- All origins allowed in development mode

## 🔧 Immediate Fix Steps

### Step 1: Restart the Server
The server should automatically restart with nodemon, but if not:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### Step 2: Wait for Rate Limit Reset
Current rate limits reset every 5 minutes. Wait a few minutes or restart the server.

### Step 3: Test the Fix

**Test 1 - Health Check:**
```
http://localhost:5000/health
```

**Test 2 - CORS Test:**
```
http://localhost:5000/test
```

**Test 3 - Payment Verification (from browser console):**
```javascript
fetch('http://localhost:5000/api/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId: 'WX1746604157493' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

## 🎯 What Changed

### Before (Problematic):
```
Payment Rate Limit: 10 requests per 5 minutes
↓
CORS OPTIONS request → Rate limited → Failed to fetch
```

### After (Fixed):
```
Development: 1000 requests per 5 minutes
↓
CORS OPTIONS request → Allowed → Success
```

## 🔍 Verification

After restarting, you should see in the server logs:
- No more "Rate limit exceeded" messages
- Successful OPTIONS and POST requests
- Status 200 instead of Status 429

## 📊 New Rate Limits

### Development Mode:
- **General API**: 1000 requests per 5 minutes
- **Payment endpoints**: Use general limits (no separate restriction)
- **CORS preflight**: No rate limiting

### Production Mode:
- **General API**: 100 requests per 15 minutes
- **Payment endpoints**: 10 requests per 5 minutes
- **CORS**: Restricted to your domains

## 🚀 Expected Result

Your payment verification should now work without "Failed to fetch" errors. The server logs should show:

```
📡 [timestamp] OPTIONS /api/verify-payment - IP: ::1
📤 [timestamp] OPTIONS /api/verify-payment - Status: 200
📡 [timestamp] POST /api/verify-payment - IP: ::1  
📤 [timestamp] POST /api/verify-payment - Status: 200
```

No more Status: 429 (Rate limit exceeded) errors!
