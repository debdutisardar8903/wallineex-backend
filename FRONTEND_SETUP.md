# Frontend Environment Setup

## 🔧 Frontend Configuration Required

To fix the "Failed to fetch" error, you need to create environment variables for your frontend.

### 1. Create Frontend Environment File

Create a file named `.env.local` in your `wallineex-store` directory:

**File Location:** `d:\Wallineex.store\wallineex-store\.env.local`

**Content:**
```env
# Backend Server URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Frontend URL (for return URLs)
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### 2. Alternative: Create .env.development

If `.env.local` doesn't work, create `.env.development`:

**File Location:** `d:\Wallineex.store\wallineex-store\.env.development`

**Content:**
```env
# Backend Server URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Frontend URL (for return URLs)
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### 3. Restart Your Frontend

After creating the environment file:

```bash
cd wallineex-store
npm run dev
```

## 🧪 Test the Connection

### 1. Test Backend Health
Open: `http://localhost:5000/health`

Should return:
```json
{
  "status": "OK",
  "message": "Wallineex Cashfree Server is running",
  "timestamp": "2025-10-29T...",
  "environment": "development",
  "cors": "open"
}
```

### 2. Test CORS
Open: `http://localhost:5000/test`

Should return:
```json
{
  "message": "CORS test successful",
  "origin": "http://localhost:3000",
  "timestamp": "2025-10-29T..."
}
```

### 3. Test from Frontend Console

Open your frontend (`http://localhost:3000`) and run in browser console:

```javascript
fetch('http://localhost:5000/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Should log the health response without errors.

## 🔍 Troubleshooting

### If Still Getting "Failed to fetch":

1. **Check Backend Server:**
   ```bash
   # In wallineex-casfee-server directory
   npm run dev
   ```

2. **Check Frontend Environment:**
   - Ensure `.env.local` exists in `wallineex-store` directory
   - Restart frontend after creating environment file

3. **Check Browser Console:**
   - Look for CORS errors
   - Check if requests are going to correct URL

4. **Test Direct API Call:**
   ```javascript
   // In browser console on localhost:3000
   fetch('http://localhost:5000/api/verify-payment', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ orderId: 'WX1234567890123' })
   })
   .then(r => r.json())
   .then(console.log)
   ```

### Common Issues:

1. **Environment Variables Not Loading:**
   - File must be named exactly `.env.local`
   - Must be in root of `wallineex-store` directory
   - Restart frontend after creating file

2. **CORS Errors:**
   - Backend now allows all origins in development
   - Check browser network tab for actual error

3. **Backend Not Running:**
   - Ensure `npm run dev` is running in `wallineex-casfee-server`
   - Check `http://localhost:5000/health`

## 📝 Environment File Template

Copy this exactly into `.env.local`:

```env
# Wallineex Store Frontend Environment Variables

# Backend Server Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Frontend URL Configuration  
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Optional: For production deployment
# NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
# NEXT_PUBLIC_FRONTEND_URL=https://www.wallineex.store/
```

---

**After creating the environment file and restarting your frontend, the "Failed to fetch" error should be resolved!** 🎉
