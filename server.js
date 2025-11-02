const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// In-memory cache for verified payments (prevents repeated API calls)
const paymentCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting for payment verification (per IP)
const verificationRateLimit = new Map();

// Cleanup function to prevent memory leaks
const cleanupCache = () => {
  const now = Date.now();
  
  // Clean expired payment cache entries
  for (const [key, value] of paymentCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      paymentCache.delete(key);
    }
  }
  
  // Clean old rate limit entries (older than 10 minutes)
  for (const [key, value] of verificationRateLimit.entries()) {
    if (now - value.lastCall > 10 * 60 * 1000) {
      verificationRateLimit.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://www.wallineex.store',
      'https://wallineex.store',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // For Netlify deployments, allow any subdomain of netlify.app
    if (origin.includes('.netlify.app')) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: false, // Changed to false for better compatibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cashfree Configuration
const CASHFREE_CLIENT_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_SECRET_KEY;

// Determine Cashfree environment based on credentials or explicit env var
const CASHFREE_ENVIRONMENT = process.env.CASHFREE_ENVIRONMENT || 
  (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox');

const CASHFREE_BASE_URL = CASHFREE_ENVIRONMENT === 'production'
  ? 'https://api.cashfree.com/pg' 
  : 'https://sandbox.cashfree.com/pg';

console.log('Cashfree Configuration:');
console.log('- Environment:', CASHFREE_ENVIRONMENT);
console.log('- Base URL:', CASHFREE_BASE_URL);
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Generate signature for Cashfree
const generateSignature = (postData, timestamp) => {
  const signatureData = postData + timestamp;
  return crypto
    .createHmac('sha256', CASHFREE_CLIENT_SECRET)
    .update(signatureData)
    .digest('base64');
};

// Create Order Token Endpoint - Matches your frontend cashfree.js expectations
app.post('/api/create-order', async (req, res) => {
  try {
    console.log('=== CREATE ORDER REQUEST ===');
    console.log('Request origin:', req.get('origin'));
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Environment variables:');
    console.log('CASHFREE_APP_ID:', CASHFREE_CLIENT_ID ? 'Present' : 'Missing');
    console.log('CASHFREE_SECRET_KEY:', CASHFREE_CLIENT_SECRET ? 'Present' : 'Missing');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('CASHFREE_BASE_URL:', CASHFREE_BASE_URL);
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
    
    const { 
      orderId, 
      orderAmount, 
      customerName, 
      customerEmail, 
      customerPhone, 
      wallpaperName,  // This maps to productName from your frontend
      wallpaperId,    // This maps to productId from your frontend
      returnUrl,
      notifyUrl 
    } = req.body;

    // Validate required fields
    if (!orderId || !orderAmount || !customerName || !customerEmail || !customerPhone) {
      console.log('Missing required fields:', { orderId, orderAmount, customerName, customerEmail, customerPhone });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate environment variables
    if (!CASHFREE_CLIENT_ID || !CASHFREE_CLIENT_SECRET) {
      console.log('Missing Cashfree credentials');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Cashfree credentials'
      });
    }

    // Generate alphanumeric customer ID from email
    const generateCustomerId = (email) => {
      return email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    };

    const orderData = {
      order_id: orderId,
      order_amount: parseFloat(orderAmount),
      order_currency: 'INR',
      customer_details: {
        customer_id: generateCustomerId(customerEmail),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone
      },
      order_meta: {
        return_url: returnUrl || `${process.env.FRONTEND_URL || 'https://www.wallineex.store'}/payment-success?order_id={order_id}`,
        notify_url: notifyUrl || `${req.protocol}://${req.get('host')}/api/payment-webhook`,
        payment_methods: 'cc,dc,nb,upi,paypal,app'
      },
      order_note: `Purchase from Wallineex Store: ${wallpaperName || 'Digital Product'}`,
      order_tags: {
        product_id: wallpaperId,
        product_name: wallpaperName,
        store: 'wallineex'
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': CASHFREE_CLIENT_ID,
      'x-client-secret': CASHFREE_CLIENT_SECRET,
      'x-request-id': crypto.randomUUID(),
      'x-idempotency-key': orderId
    };

    console.log('Order data to send:', JSON.stringify(orderData, null, 2));
    console.log('Return URL:', orderData.order_meta.return_url);
    console.log('Notify URL:', orderData.order_meta.notify_url);

    const response = await axios.post(
      `${CASHFREE_BASE_URL}/orders`,
      orderData,
      { headers }
    );

    console.log('Cashfree response status:', response.status);
    console.log('Cashfree response data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.payment_session_id) {
      // Return format expected by your frontend cashfree.js
      res.json({
        success: true,
        order_token: response.data.payment_session_id, // For backward compatibility
        payment_session_id: response.data.payment_session_id,
        order_id: response.data.order_id,
        order_status: response.data.order_status
      });
    } else {
      console.log('Unexpected response structure:', response.data);
      throw new Error(`Failed to create order: ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('=== ERROR CREATING ORDER ===');
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to create order'
    });
  }
});

// Rate limiting helper function
const checkRateLimit = (ip, orderId) => {
  const key = `${ip}-${orderId}`;
  const now = Date.now();
  const limit = verificationRateLimit.get(key);
  
  if (limit && now - limit.lastCall < 2000) { // 2 second cooldown
    limit.count++;
    if (limit.count > 5) { // Max 5 calls per 2 seconds
      return false;
    }
  } else {
    verificationRateLimit.set(key, { lastCall: now, count: 1 });
  }
  
  return true;
};

// Verify Payment Endpoint - Matches your frontend cashfree.js expectations
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    console.log('=== VERIFY PAYMENT REQUEST ===');
    console.log('Order ID to verify:', orderId);
    console.log('Client IP:', clientIP);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Rate limiting check
    if (!checkRateLimit(clientIP, orderId)) {
      console.log('Rate limit exceeded for:', clientIP, orderId);
      return res.status(429).json({
        success: false,
        error: 'Too many verification requests. Please wait before trying again.',
        cached: false
      });
    }

    // Check cache first
    const cacheKey = `payment-${orderId}`;
    const cachedResult = paymentCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
      console.log('Returning cached result for order:', orderId);
      return res.json({
        ...cachedResult.data,
        cached: true,
        cache_age: Math.floor((Date.now() - cachedResult.timestamp) / 1000)
      });
    }

    // Validate environment variables
    if (!CASHFREE_CLIENT_ID || !CASHFREE_CLIENT_SECRET) {
      console.log('Missing Cashfree credentials for verification');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Cashfree credentials'
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': CASHFREE_CLIENT_ID,
      'x-client-secret': CASHFREE_CLIENT_SECRET,
      'x-request-id': crypto.randomUUID()
    };

    console.log('Making fresh API call to Cashfree for order:', orderId);
    console.log('Verification URL:', `${CASHFREE_BASE_URL}/orders/${orderId}`);

    const response = await axios.get(
      `${CASHFREE_BASE_URL}/orders/${orderId}`,
      { headers }
    );

    console.log('Cashfree verification response received');

    if (response.data) {
      const isPaid = response.data.order_status === 'PAID';
      console.log('Payment status check:', { 
        order_status: response.data.order_status, 
        isPaid 
      });

      // Return format expected by your frontend cashfree.js verifyPayment function
      const result = {
        success: true,
        order_status: response.data.order_status,
        payment_status: isPaid ? 'SUCCESS' : 'PENDING',
        order_data: response.data,
        order_amount: response.data.order_amount,
        order_id: response.data.order_id,
        cached: false
      };

      // Cache the result if payment is successful
      if (isPaid) {
        paymentCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        console.log('Cached successful payment result for order:', orderId);
      }

      res.json(result);
    } else {
      throw new Error('Failed to verify payment - no response data');
    }

  } catch (error) {
    console.error('=== ERROR VERIFYING PAYMENT ===');
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to verify payment'
    });
  }
});

// Webhook handler function (shared logic)
const handleWebhook = (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.body.toString();

    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Signature:', signature);
    console.log('Timestamp:', timestamp);
    console.log('Raw body:', rawBody);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_CLIENT_SECRET)
      .update(timestamp + rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      console.error('Expected:', expectedSignature);
      console.error('Received:', signature);
      return res.status(400).send('Invalid signature');
    }

    const webhookData = JSON.parse(rawBody);
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

    // Handle different webhook events
    if (webhookData.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const { order } = webhookData.data;
      
      // Clear cache for this order to force fresh verification
      const cacheKey = `payment-${order.order_id}`;
      paymentCache.delete(cacheKey);
      
      console.log('Payment successful for order:', order.order_id);
      console.log('Cache cleared for order:', order.order_id);
    }

    res.status(200).send('Webhook processed successfully');

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
};

// Payment Webhook Endpoint (matches your frontend notifyUrl)
app.post('/api/payment-webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Cashfree Webhook Endpoint (alternative endpoint)
app.post('/api/webhook/cashfree', express.raw({ type: 'application/json' }), handleWebhook);

// Clear cache endpoint (for debugging)
app.post('/api/clear-cache', (req, res) => {
  const { orderId } = req.body;
  
  if (orderId) {
    const cacheKey = `payment-${orderId}`;
    const deleted = paymentCache.delete(cacheKey);
    res.json({
      success: true,
      message: `Cache cleared for order: ${orderId}`,
      deleted
    });
  } else {
    paymentCache.clear();
    verificationRateLimit.clear();
    res.json({
      success: true,
      message: 'All cache and rate limit data cleared'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'https://wallineex-backend.onrender.com' 
    : `http://localhost:${PORT}`;
    
  res.json({ 
    success: true, 
    message: 'Wallineex Payment Server is running',
    server_url: serverUrl,
    frontend_url: process.env.FRONTEND_URL || 'https://www.wallineex.store',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cache_stats: {
      payment_cache_size: paymentCache.size,
      rate_limit_entries: verificationRateLimit.size
    },
    cors_origins: [
      process.env.FRONTEND_URL || 'http://localhost:3000', 
      'https://www.wallineex.store',
      'https://wallineex.store'
    ],
    cashfree_config: {
      environment: CASHFREE_ENVIRONMENT,
      base_url: CASHFREE_BASE_URL,
      client_id_present: !!CASHFREE_CLIENT_ID,
      client_secret_present: !!CASHFREE_CLIENT_SECRET,
      client_id_prefix: CASHFREE_CLIENT_ID ? CASHFREE_CLIENT_ID.substring(0, 8) + '...' : 'Missing'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Wallineex Backend API',
    version: '1.0.0',
    store: 'Wallineex Digital Store',
    endpoints: {
      health: '/api/health',
      create_order: '/api/create-order',
      verify_payment: '/api/verify-payment',
      webhook_payment: '/api/payment-webhook',
      webhook_cashfree: '/api/webhook/cashfree',
      clear_cache: '/api/clear-cache'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/create-order',
      'POST /api/verify-payment',
      'POST /api/payment-webhook',
      'POST /api/webhook/cashfree',
      'POST /api/clear-cache'
    ]
  });
});

app.listen(PORT, () => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'https://wallineex-backend.onrender.com' 
    : `http://localhost:${PORT}`;
    
  console.log(`🚀 Wallineex Payment Server running on port ${PORT}`);
  console.log(`📡 Health check: ${serverUrl}/api/health`);
  console.log(`💳 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server URL: ${serverUrl}`);
  console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL || 'https://www.wallineex.store'}`);
  console.log(`🔒 CORS Origins: https://www.wallineex.store, wallineex.store, localhost:3000`);
  console.log(`💰 Cashfree Environment: ${CASHFREE_ENVIRONMENT}`);
  console.log(`💰 Cashfree Base URL: ${CASHFREE_BASE_URL}`);
  console.log(`🔑 Cashfree Credentials: ${CASHFREE_CLIENT_ID ? 'Present' : 'Missing'}`);
  console.log(`🔑 Cashfree Client ID: ${CASHFREE_CLIENT_ID ? CASHFREE_CLIENT_ID.substring(0, 8) + '...' : 'Missing'}`);
});

module.exports = app;
