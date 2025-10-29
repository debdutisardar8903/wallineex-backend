# Wallineex Cashfree Server

A Node.js backend server for handling Cashfree payment gateway integration for the Wallineex Store.

## 🚀 Features

- **Payment Order Creation**: Create secure payment orders with Cashfree
- **Payment Verification**: Verify payment status and handle callbacks
- **Webhook Handling**: Process real-time payment notifications
- **Security**: Rate limiting, CORS, input validation, and signature verification
- **Logging**: Comprehensive request/response logging with data sanitization
- **Error Handling**: Robust error handling with detailed responses

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn package manager
- Cashfree merchant account (sandbox/production)

## 🛠️ Installation

1. **Clone or create the project directory:**
   ```bash
   mkdir wallineex-cashfree-server
   cd wallineex-cashfree-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file:**
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000

   # Cashfree Configuration
   CASHFREE_APP_ID=your_cashfree_app_id_here
   CASHFREE_SECRET_KEY=your_cashfree_secret_key_here
   CASHFREE_API_VERSION=2023-08-01

   # Frontend URLs
   FRONTEND_URL=https://www.wallineex.store/
   FRONTEND_URL_LOCAL=http://localhost:3000
   ```

## 🚦 Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📡 API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Wallineex Cashfree Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Create Payment Order
```http
POST /api/create-order
```

**Request Body:**
```json
{
  "orderId": "WX1234567890123",
  "orderAmount": 299.00,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "9876543210",
  "wallpaperName": "Abstract Wallpaper",
  "wallpaperId": "wp_123",
  "returnUrl": "https://www.wallineex.store/payment-success?order_id=WX1234567890123",
  "notifyUrl": "https://your-server.com/api/payment-webhook"
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "WX1234567890123",
  "payment_session_id": "session_abc123",
  "order_status": "ACTIVE",
  "cashfree_order_id": "cf_order_123"
}
```

### 3. Verify Payment
```http
POST /api/verify-payment
```

**Request Body:**
```json
{
  "orderId": "WX1234567890123"
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "WX1234567890123",
  "order_status": "PAID",
  "payment_status": "SUCCESS",
  "order_amount": 299.00,
  "order_currency": "INR",
  "customer_details": {
    "customer_name": "John Doe",
    "customer_email": "jo**@example.com",
    "customer_phone": "98******10"
  },
  "verified_at": "2024-01-01T00:00:00.000Z"
}
```

### 4. Get Order Status
```http
GET /api/order-status/:orderId
```

**Response:**
```json
{
  "success": true,
  "order_id": "WX1234567890123",
  "order_status": "PAID",
  "order_amount": 299.00,
  "order_currency": "INR",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 5. Payment Webhook
```http
POST /api/payment-webhook
```

This endpoint receives real-time payment notifications from Cashfree. It automatically verifies the webhook signature and processes the payment status updates.

## 🔒 Security Features

### Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **Payment Operations**: 10 requests per 5 minutes per IP
- **Webhooks**: 50 requests per 1 minute per IP

### CORS Protection
- Configured for specific frontend domains
- Blocks unauthorized origins

### Input Validation
- Email format validation
- Indian phone number validation (10 digits, 6-9 prefix)
- Order amount limits (₹1 - ₹5,00,000)
- Order ID format validation (WX + 13 digits)

### Data Sanitization
- Sensitive data masking in logs
- Request size limiting (1MB max)
- XSS and injection protection

### Webhook Security
- Signature verification using HMAC-SHA256
- Timestamp validation (5-minute window)
- Raw body parsing for signature verification

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | No | development |
| `PORT` | Server port | No | 5000 |
| `CASHFREE_APP_ID` | Cashfree Application ID | Yes | - |
| `CASHFREE_SECRET_KEY` | Cashfree Secret Key | Yes | - |
| `CASHFREE_API_VERSION` | Cashfree API Version | No | 2023-08-01 |
| `FRONTEND_URL` | Production frontend URL | No | - |
| `FRONTEND_URL_LOCAL` | Development frontend URL | No | http://localhost:3000 |

### Cashfree Configuration

1. **Sandbox Environment:**
   - Base URL: `https://sandbox.cashfree.com/pg`
   - Use test credentials from Cashfree dashboard

2. **Production Environment:**
   - Base URL: `https://api.cashfree.com/pg`
   - Use live credentials from Cashfree dashboard

## 📊 Logging

The server includes comprehensive logging with:

- **Request/Response Logging**: All API calls with sanitized data
- **Error Logging**: Detailed error information with stack traces (development)
- **Webhook Logging**: Payment notification processing
- **Security Logging**: Rate limiting and unauthorized access attempts

### Log Format
```
🔵 [2024-01-01T00:00:00.000Z] CREATE_ORDER REQUEST:
{
  "orderId": "WX1234567890123",
  "orderAmount": 299,
  "customerEmail": "jo**@example.com",
  "customerPhone": "98******10"
}

🟢 [2024-01-01T00:00:00.000Z] CREATE_ORDER RESPONSE:
{
  "success": true,
  "payment_session_id": "session_abc123"
}
```

## 🚨 Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": ["Invalid email format", "Order amount required"]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Order not found",
  "order_id": "WX1234567890123"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later",
  "retryAfter": 900
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## 🔄 Integration with Frontend

This server is designed to work with the Wallineex Store frontend. The frontend `cashfree.js` utility functions should be configured to use this server:

```javascript
// In your frontend .env file
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## 📝 Development

### Project Structure
```
wallineex-cashfree-server/
├── config/
│   └── cashfree.js          # Cashfree configuration
├── middleware/
│   └── security.js          # Security middleware
├── routes/
│   └── payment.js           # Payment route handlers
├── utils/
│   ├── logger.js            # Logging utilities
│   └── validation.js        # Input validation
├── .env.example             # Environment template
├── package.json             # Dependencies
├── README.md               # Documentation
└── server.js               # Main server file
```

### Adding New Features

1. **New Routes**: Add to `routes/` directory
2. **Middleware**: Add to `middleware/` directory
3. **Utilities**: Add to `utils/` directory
4. **Configuration**: Update `config/` files

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production Cashfree credentials
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting for production load
- [ ] Set up monitoring and logging
- [ ] Configure webhook URLs in Cashfree dashboard
- [ ] Test all payment flows thoroughly

### Recommended Hosting

- **Heroku**: Easy deployment with environment variables
- **Railway**: Modern deployment platform
- **DigitalOcean App Platform**: Scalable hosting
- **AWS EC2**: Full control deployment

## 📞 Support

For issues related to:
- **Cashfree Integration**: Check Cashfree documentation
- **Server Configuration**: Review environment variables
- **Payment Flows**: Test with Cashfree sandbox first

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with ❤️ for Wallineex Store**
