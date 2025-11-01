# Wallineex Backend - Cashfree Payment Server

This is the backend server for Wallineex Store that handles Cashfree payment integration.

## Features

- ✅ **Order Creation**: Creates payment orders with Cashfree
- ✅ **Payment Verification**: Verifies payment status with caching
- ✅ **Webhook Handling**: Processes Cashfree webhooks
- ✅ **Rate Limiting**: Prevents API abuse
- ✅ **CORS Support**: Configured for frontend integration
- ✅ **Error Handling**: Comprehensive error logging
- ✅ **Cache Management**: In-memory caching for performance

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your Cashfree credentials
```

### 3. Required Environment Variables
```env
CASHFREE_APP_ID=your_cashfree_app_id_here
CASHFREE_SECRET_KEY=your_cashfree_secret_key_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 4. Get Cashfree Credentials
1. Sign up at [Cashfree Dashboard](https://merchant.cashfree.com/)
2. Go to Developers > API Keys
3. Copy your App ID and Secret Key
4. For testing, use Sandbox credentials
5. For production, use Production credentials

### 5. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Create Payment Order
```
POST /api/create-order
Content-Type: application/json

{
  "orderId": "WX1234567890123",
  "orderAmount": 299,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "9876543210",
  "wallpaperName": "Premium Wallpaper",
  "wallpaperId": "product123",
  "returnUrl": "https://www.wallineex.store/payment-success?order_id=WX1234567890123",
  "notifyUrl": "https://wallineex-backend.onrender.com/api/payment-webhook"
}
```

### Verify Payment
```
POST /api/verify-payment
Content-Type: application/json

{
  "orderId": "WX1234567890123"
}
```

### Payment Webhook
```
POST /api/payment-webhook
Content-Type: application/json
```

## Integration with Frontend

Your frontend `src/lib/cashfree.js` is already configured to work with this backend:

1. **Order Creation**: Calls `/api/create-order`
2. **Payment Verification**: Calls `/api/verify-payment`
3. **Webhook URL**: Points to `/api/payment-webhook`

## Deployment

### Render.com (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js

### Environment Variables for Production
```env
CASHFREE_APP_ID=your_production_app_id
CASHFREE_SECRET_KEY=your_production_secret_key
NODE_ENV=production
FRONTEND_URL=https://www.wallineex.store
PORT=5000
```

## Security Features

- ✅ **Webhook Signature Verification**
- ✅ **Rate Limiting** (5 requests per 2 seconds per IP)
- ✅ **Input Validation**
- ✅ **CORS Protection**
- ✅ **Environment-based Configuration**

## Monitoring

### Health Check
Visit `/api/health` to check server status and configuration.

### Logs
The server provides detailed console logs for:
- Order creation requests
- Payment verification
- Webhook events
- Error tracking

## Troubleshooting

### Common Issues

1. **Missing Cashfree Credentials**
   - Check your `.env` file
   - Verify credentials in Cashfree dashboard

2. **CORS Errors**
   - Ensure `FRONTEND_URL` matches your frontend domain
   - Check CORS configuration in server.js

3. **Payment Verification Fails**
   - Check order ID format
   - Verify Cashfree API credentials
   - Check network connectivity

4. **Webhook Not Receiving**
   - Ensure webhook URL is publicly accessible
   - Check Cashfree webhook configuration
   - Verify webhook signature

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## Support

For issues related to:
- **Cashfree API**: Check [Cashfree Documentation](https://docs.cashfree.com/)
- **Server Issues**: Check server logs and health endpoint
- **Integration**: Verify frontend-backend communication

## License

MIT License - See LICENSE file for details.
