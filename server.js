const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000', 
    'https://wallineex.netlify.app',
    'https://wallineex.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cashfree Configuration
const CASHFREE_CLIENT_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.cashfree.com/pg' 
  : 'https://sandbox.cashfree.com/pg';

// Generate signature for Cashfree
const generateSignature = (postData, timestamp) => {
  const signatureData = postData + timestamp;
  return crypto
    .createHmac('sha256', CASHFREE_CLIENT_SECRET)
    .update(signatureData)
    .digest('base64');
};

// Create Order Token Endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    console.log('=== CREATE ORDER REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Environment variables:');
    console.log('CASHFREE_APP_ID:', CASHFREE_CLIENT_ID ? 'Present' : 'Missing');
    console.log('CASHFREE_SECRET_KEY:', CASHFREE_CLIENT_SECRET ? 'Present' : 'Missing');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('CASHFREE_BASE_URL:', CASHFREE_BASE_URL);
    
    const { 
      orderId, 
      orderAmount, 
      customerName, 
      customerEmail, 
      customerPhone, 
      wallpaperName,
      wallpaperId 
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
      console.log('CASHFREE_APP_ID value:', process.env.CASHFREE_APP_ID);
      console.log('CASHFREE_SECRET_KEY value:', process.env.CASHFREE_SECRET_KEY);
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
        return_url: `${req.headers.origin}/payment-success?order_id={order_id}`,
        notify_url: `https://${req.get('host')}/api/webhook/cashfree`,
        payment_methods: 'cc,dc,nb,upi,paypal,app'
      },
      order_note: `Purchase of premium wallpaper: ${wallpaperName}`,
      order_tags: {
        wallpaper_id: wallpaperId,
        wallpaper_name: wallpaperName
      }
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const postData = JSON.stringify(orderData);
    const signature = generateSignature(postData, timestamp);

    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': CASHFREE_CLIENT_ID,
      'x-client-secret': CASHFREE_CLIENT_SECRET,
      'x-request-id': crypto.randomUUID(),
      'x-idempotency-key': orderId
    };

    console.log('Order data to send:', JSON.stringify(orderData, null, 2));
    console.log('Headers:', headers);

    const response = await axios.post(
      `${CASHFREE_BASE_URL}/orders`,
      orderData,
      { headers }
    );

    console.log('Cashfree response status:', response.status);
    console.log('Cashfree response data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.payment_session_id) {
      // Cashfree API v2022-09-01 returns payment_session_id instead of order_token
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
    console.error('Full error:', error);
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to create order'
    });
  }
});

// Verify Payment Endpoint
app.post('/api/verify-payment', async (req, res) => {
  try {
    console.log('=== VERIFY PAYMENT REQUEST ===');
    const { orderId } = req.body;
    console.log('Order ID to verify:', orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
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

    console.log('Verification headers:', headers);
    console.log('Verification URL:', `${CASHFREE_BASE_URL}/orders/${orderId}`);

    const response = await axios.get(
      `${CASHFREE_BASE_URL}/orders/${orderId}`,
      { headers }
    );

    console.log('Cashfree verification response:', JSON.stringify(response.data, null, 2));

    if (response.data) {
      const isPaid = response.data.order_status === 'PAID';
      console.log('Payment status check:', { 
        order_status: response.data.order_status, 
        isPaid 
      });

      res.json({
        success: true,
        order_status: response.data.order_status,
        payment_status: isPaid ? 'SUCCESS' : 'PENDING',
        order_data: response.data
      });
    } else {
      throw new Error('Failed to verify payment - no response data');
    }

  } catch (error) {
    console.error('=== ERROR VERIFYING PAYMENT ===');
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Full error:', error);
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to verify payment'
    });
  }
});

// Cashfree Webhook Endpoint (for automatic payment confirmation)
app.post('/api/webhook/cashfree', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.body.toString();

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_CLIENT_SECRET)
      .update(timestamp + rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const webhookData = JSON.parse(rawBody);
    console.log('Webhook received:', webhookData);

    // Handle different webhook events
    if (webhookData.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const { order } = webhookData.data;
      
      // Here you would typically save the purchase data to Firebase
      // This will be handled by the frontend after payment verification
      console.log('Payment successful for order:', order.order_id);
      
      // In production, you could directly save to Firebase here
      // using Firebase Admin SDK
    }

    res.status(200).send('Webhook processed successfully');

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'https://wallineex-backend.onrender.com' 
    : `http://localhost:${PORT}`;
    
  res.json({ 
    success: true, 
    message: 'PixelMart Payment Server is running',
    server_url: serverUrl,
    frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cors_origins: [
      process.env.FRONTEND_URL || 'http://localhost:3000', 
      'https://wallineex.netlify.app',
      'https://wallineex.netlify.app'
    ]
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
    message: 'WALLINEXT Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      create_order: '/api/create-order',
      verify_payment: '/api/verify-payment',
      webhook: '/api/webhook'
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
      'POST /api/webhook'
    ]
  });
});

app.listen(PORT, () => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'https://wallineex-backend.onrender.com' 
    : `http://localhost:${PORT}`;
    
  console.log(`🚀 PixelMart Payment Server running on port ${PORT}`);
  console.log(`📡 Health check: ${serverUrl}/api/health`);
  console.log(`💳 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server URL: ${serverUrl}`);
  console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔒 CORS Origins: https://wallineex.netlify.app, wallineex.netlify.app, localhost:3000`);
});

module.exports = app;
