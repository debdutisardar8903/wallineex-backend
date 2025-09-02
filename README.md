# WALLINEXT Payment Backend

Node.js backend server for Cashfree payment integration with WALLINEXT wallpaper application.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file with your Cashfree credentials
```

### 3. Configure Environment Variables
Edit the `.env` file with your actual values:

```env
# Cashfree Payment Gateway Configuration
CASHFREE_APP_ID=your_cashfree_app_id_here
CASHFREE_SECRET_KEY=your_cashfree_secret_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Get Cashfree Credentials

#### For Testing (Sandbox):
1. Visit [Cashfree Merchant Dashboard](https://merchant.cashfree.com/)
2. Sign up for a free account
3. Go to **Developers** → **API Keys**
4. Copy your **App ID** and **Secret Key** from the **Sandbox** section

#### For Production:
1. Complete KYC verification on Cashfree
2. Get your **Live** credentials from the dashboard
3. Set `NODE_ENV=production` in your `.env` file

### 5. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Health Check
```
GET /api/health
```

### Create Payment Order
```
POST /api/create-order
Content-Type: application/json

{
  "orderId": "WALL_1234567890_123",
  "orderAmount": 99,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "9999999999",
  "wallpaperName": "Premium Wallpaper",
  "wallpaperId": "wallpaper_id"
}
```

### Verify Payment
```
POST /api/verify-payment
Content-Type: application/json

{
  "orderId": "WALL_1234567890_123"
}
```

### Webhook Endpoint
```
POST /api/webhook/cashfree
```
*This endpoint receives automatic payment confirmations from Cashfree*

## 🔧 Frontend Integration

Add this to your React app's `.env` file:
```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

## 🔒 Security Features

- **CORS Protection**: Only allows requests from specified origins
- **Webhook Signature Verification**: Validates Cashfree webhook authenticity
- **Environment Variables**: Keeps sensitive credentials secure
- **Request Validation**: Validates all incoming payment requests

## 🌐 Deployment

### Heroku Deployment
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create wallinext-payment-backend

# Set environment variables
heroku config:set CASHFREE_APP_ID=your_app_id
heroku config:set CASHFREE_SECRET_KEY=your_secret_key
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-frontend-domain.com

# Deploy
git add .
git commit -m "Deploy payment backend"
git push heroku main
```

### Other Platforms
- **Vercel**: Add environment variables in dashboard
- **Netlify Functions**: Convert to serverless functions
- **AWS Lambda**: Use serverless framework
- **Railway**: Connect GitHub repo and set env vars

## 🧪 Testing

### Test Payment Flow
1. Start the backend server
2. Start your React frontend
3. Navigate to a premium wallpaper
4. Click "Buy Now"
5. Use Cashfree test credentials:
   - **Test Card**: 4111 1111 1111 1111
   - **CVV**: Any 3 digits
   - **Expiry**: Any future date

### Test Webhook
```bash
# Use ngrok to expose local server
npm install -g ngrok
ngrok http 5000

# Update Cashfree webhook URL to: https://your-ngrok-url.ngrok.io/api/webhook/cashfree
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Error**
   - Check `FRONTEND_URL` in `.env`
   - Ensure frontend URL matches exactly

2. **Invalid Credentials**
   - Verify Cashfree App ID and Secret Key
   - Check if using correct environment (sandbox/live)

3. **Webhook Not Working**
   - Ensure webhook URL is publicly accessible
   - Check webhook signature verification

4. **Payment Fails**
   - Check Cashfree dashboard for error logs
   - Verify order amount and customer details

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 📚 Documentation

- [Cashfree Payment Gateway Docs](https://docs.cashfree.com/docs/payment-gateway)
- [Cashfree API Reference](https://docs.cashfree.com/reference)
- [Express.js Documentation](https://expressjs.com/)

## 🔄 Webhook Events

The server handles these Cashfree webhook events:
- `PAYMENT_SUCCESS_WEBHOOK`
- `PAYMENT_FAILED_WEBHOOK`
- `PAYMENT_USER_DROPPED_WEBHOOK`

## 📝 Logs

Server logs include:
- Payment order creation
- Webhook events
- Error tracking
- Request validation

## 🚨 Production Checklist

- [ ] Use HTTPS for webhook URL
- [ ] Set `NODE_ENV=production`
- [ ] Use live Cashfree credentials
- [ ] Configure proper CORS origins
- [ ] Set up error monitoring
- [ ] Enable request logging
- [ ] Configure rate limiting
- [ ] Set up health checks
