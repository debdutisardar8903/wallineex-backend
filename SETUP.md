# Wallineex Cashfree Server Setup Guide

## 🚀 Quick Setup Instructions

### 1. Create Environment File

Create a `.env` file in the root directory with your Cashfree credentials:

```env
# Cashfree Payment Gateway Configuration
CASHFREE_APP_ID=your_cashfree_app_id_here
CASHFREE_SECRET_KEY=your_cashfree_secret_key_here
CASHFREE_API_VERSION=2023-08-01

# Server Configuration
PORT=5000
NODE_ENV=development

# Environment URLs
CASHFREE_BASE_URL_SANDBOX=https://sandbox.cashfree.com/pg
CASHFREE_BASE_URL_PRODUCTION=https://api.cashfree.com/pg

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Production Frontend URL (uncomment for production)
# FRONTEND_URL=https://www.wallineex.store/

# Additional Frontend URLs for CORS (optional)
FRONTEND_URL_LOCAL=http://localhost:3000
FRONTEND_URL_PRODUCTION=https://www.wallineex.store/
```

### 2. Install Dependencies

```bash
cd wallineex-casfee-server
npm install
```

### 3. Start the Server

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### 4. Verify Server is Running

Open your browser and go to: `http://localhost:5000/health`

You should see:
```json
{
  "status": "OK",
  "message": "Wallineex Cashfree Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Frontend Configuration

Update your frontend `.env` file to point to the server:

```env
# In your wallineex-store/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## 🧪 Testing the Integration

### Test Order Creation

```bash
curl -X POST http://localhost:5000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "WX1234567890123",
    "orderAmount": 299,
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "customerPhone": "9876543210",
    "wallpaperName": "Test Wallpaper",
    "wallpaperId": "wp_test_123",
    "returnUrl": "http://localhost:3000/payment-success?order_id=WX1234567890123",
    "notifyUrl": "http://localhost:5000/api/payment-webhook"
  }'
```

### Test Payment Verification

```bash
curl -X POST http://localhost:5000/api/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "WX1234567890123"
  }'
```

## 🔒 Security Features Enabled

- ✅ **Rate Limiting**: 10 payment requests per 5 minutes per IP
- ✅ **CORS Protection**: Only your frontend domains allowed
- ✅ **Input Validation**: All payment data validated
- ✅ **Request Logging**: All API calls logged with data sanitization
- ✅ **Error Handling**: Comprehensive error responses

## 📊 Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| POST | `/api/create-order` | Create Cashfree payment order |
| POST | `/api/verify-payment` | Verify payment status |
| GET | `/api/order-status/:orderId` | Get order status |
| POST | `/api/payment-webhook` | Cashfree webhook handler |

## 🌐 Production Deployment

### For Production Environment:

1. **Update Environment Variables:**
   ```env
   NODE_ENV=production
   FRONTEND_URL=https://www.wallineex.store/
   CASHFREE_APP_ID=your_production_app_id
   CASHFREE_SECRET_KEY=your_production_secret_key
   ```

2. **Configure Webhook in Cashfree Dashboard:**
   - Webhook URL: `https://your-server-domain.com/api/payment-webhook`
   - Events: Payment Success, Payment Failed, Payment User Dropped

3. **Deploy to Your Preferred Platform:**
   - Heroku: `git push heroku main`
   - Railway: Connect GitHub repository
   - DigitalOcean: Use App Platform
   - AWS: EC2 or Elastic Beanstalk

## 🔍 Troubleshooting

### Common Issues:

1. **CORS Error:**
   - Ensure `FRONTEND_URL` matches your frontend domain exactly
   - Check browser console for specific CORS error details

2. **Cashfree API Error:**
   - Verify your `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`
   - Check if you're using sandbox credentials for development

3. **Rate Limiting:**
   - Wait for the rate limit window to reset
   - Check server logs for rate limit violations

4. **Validation Errors:**
   - Ensure order ID follows format: `WX` + 13 digits
   - Verify phone number is 10 digits starting with 6-9
   - Check email format is valid

### Debug Mode:

Set `NODE_ENV=development` for detailed error logs and stack traces.

## 📞 Support

- **Cashfree Documentation**: https://docs.cashfree.com/
- **Server Logs**: Check console output for detailed request/response logs
- **Health Check**: Always verify `/health` endpoint is responding

---

**Your Wallineex Cashfree Server is ready to handle payments! 🎉**
