const express = require('express');
const router = express.Router();
const cashfreeConfig = require('../config/cashfree');
const { validateOrderData, validatePaymentVerification } = require('../utils/validation');
const { logRequest, logResponse } = require('../utils/logger');

// Cashfree supported payment methods
// Valid options: cc, dc, ppc, ccc, emi, paypal, upi, nb, app, paylater, applepay
const SUPPORTED_PAYMENT_METHODS = 'cc,dc,nb,upi,paylater,emi';

// Handle OPTIONS preflight for create-order
router.options('/create-order', (req, res) => {
  console.log('🔍 OPTIONS preflight for /create-order received');
  console.log('🔍 Origin:', req.get('Origin'));
  console.log('🔍 Access-Control-Request-Method:', req.get('Access-Control-Request-Method'));
  console.log('🔍 Access-Control-Request-Headers:', req.get('Access-Control-Request-Headers'));
  
  res.status(200).end();
});

// Create Payment Order
router.post('/create-order', async (req, res) => {
  try {
    logRequest('CREATE_ORDER', req.body);

    // Validate request data
    const validation = validateOrderData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const {
      orderId,
      orderAmount,
      customerName,
      customerEmail,
      customerPhone,
      wallpaperName,
      wallpaperId,
      returnUrl,
      notifyUrl
    } = req.body;

    // Prepare Cashfree order data
    const orderData = {
      order_id: orderId,
      order_amount: parseFloat(orderAmount),
      order_currency: 'INR',
      customer_details: {
        customer_id: customerEmail.replace(/[^a-zA-Z0-9]/g, '_'), // Clean customer ID
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone.replace(/\s+/g, '') // Remove spaces
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
        payment_methods: SUPPORTED_PAYMENT_METHODS
      },
      order_note: `Payment for ${wallpaperName} (ID: ${wallpaperId})`
    };

    console.log('Creating Cashfree order:', JSON.stringify(orderData, null, 2));

    // Make API call to Cashfree
    const cashfreeApi = cashfreeConfig.getAxiosInstance();
    const response = await cashfreeApi.post('/orders', orderData);

    logResponse('CREATE_ORDER', response.data);

    if (response.data && response.data.payment_session_id) {
      res.json({
        success: true,
        order_id: orderId,
        payment_session_id: response.data.payment_session_id,
        order_status: response.data.order_status,
        cashfree_order_id: response.data.cf_order_id
      });
    } else {
      throw new Error('Invalid response from Cashfree API');
    }

  } catch (error) {
    console.error('Create order error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error_description || 
                        error.message || 
                        'Failed to create payment order';

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
});

// Cache for recent verification results to prevent duplicate API calls
const verificationCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

// Verify Payment
router.post('/verify-payment', async (req, res) => {
  try {
    logRequest('VERIFY_PAYMENT', req.body);

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Check cache for recent verification
    const cacheKey = `verify_${orderId}`;
    const cachedResult = verificationCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached verification for order: ${orderId}`);
      return res.json(cachedResult.data);
    }

    console.log('Verifying payment for order:', orderId);

    // Make API call to Cashfree to get order details
    const cashfreeApi = cashfreeConfig.getAxiosInstance();
    const response = await cashfreeApi.get(`/orders/${orderId}`);

    logResponse('VERIFY_PAYMENT', response.data);

    const orderData = response.data;

    // Determine payment status
    const orderStatus = orderData.order_status;
    const paymentStatus = orderData.order_status === 'PAID' ? 'SUCCESS' : 
                         orderData.order_status === 'ACTIVE' ? 'PENDING' : 'FAILED';

    // Get payment details if order is paid
    let paymentDetails = null;
    if (orderStatus === 'PAID') {
      try {
        const paymentsResponse = await cashfreeApi.get(`/orders/${orderId}/payments`);
        paymentDetails = paymentsResponse.data;
      } catch (paymentError) {
        console.warn('Could not fetch payment details:', paymentError.message);
      }
    }

    const verificationResult = {
      success: true,
      order_id: orderId,
      order_status: orderStatus,
      payment_status: paymentStatus,
      order_amount: orderData.order_amount,
      order_currency: orderData.order_currency,
      customer_details: orderData.customer_details,
      order_data: orderData,
      payment_details: paymentDetails,
      verified_at: new Date().toISOString()
    };

    // Cache the result to prevent duplicate API calls
    verificationCache.set(cacheKey, {
      data: verificationResult,
      timestamp: Date.now()
    });

    // Clean up old cache entries (simple cleanup)
    if (verificationCache.size > 100) {
      const oldEntries = Array.from(verificationCache.entries())
        .filter(([key, value]) => (Date.now() - value.timestamp) > CACHE_DURATION);
      oldEntries.forEach(([key]) => verificationCache.delete(key));
    }

    res.json(verificationResult);

  } catch (error) {
    console.error('Verify payment error:', error.response?.data || error.message);
    
    // Handle specific Cashfree errors
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        order_id: req.body.orderId
      });
    }

    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error_description || 
                        error.message || 
                        'Failed to verify payment';

    res.status(500).json({
      success: false,
      error: errorMessage,
      order_id: req.body.orderId,
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
});

// Payment Webhook Handler
router.post('/payment-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const rawBody = req.body.toString();
    const timestamp = req.headers['x-webhook-timestamp'];
    const signature = req.headers['x-webhook-signature'];

    logRequest('WEBHOOK', { 
      timestamp, 
      signature, 
      body: rawBody.substring(0, 200) + '...' 
    });

    // Verify webhook signature
    if (!cashfreeConfig.verifyWebhookSignature(rawBody, timestamp, signature)) {
      console.error('Webhook signature verification failed');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    const webhookData = JSON.parse(rawBody);
    console.log('Webhook received:', JSON.stringify(webhookData, null, 2));

    // Process webhook based on event type
    const eventType = webhookData.type;
    const orderData = webhookData.data;

    switch (eventType) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        console.log(`Payment successful for order: ${orderData.order.order_id}`);
        // Here you can add logic to update your database
        break;
        
      case 'PAYMENT_FAILED_WEBHOOK':
        console.log(`Payment failed for order: ${orderData.order.order_id}`);
        // Here you can add logic to update your database
        break;
        
      case 'PAYMENT_USER_DROPPED_WEBHOOK':
        console.log(`Payment dropped by user for order: ${orderData.order.order_id}`);
        break;
        
      default:
        console.log(`Unknown webhook event type: ${eventType}`);
    }

    // Acknowledge webhook
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Webhook processing error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// Get Order Status
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('Getting order status for:', orderId);

    const cashfreeApi = cashfreeConfig.getAxiosInstance();
    const response = await cashfreeApi.get(`/orders/${orderId}`);

    res.json({
      success: true,
      order_id: orderId,
      order_status: response.data.order_status,
      order_amount: response.data.order_amount,
      order_currency: response.data.order_currency,
      created_at: response.data.created_at,
      customer_details: response.data.customer_details
    });

  } catch (error) {
    console.error('Get order status error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        order_id: req.params.orderId
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get order status',
      order_id: req.params.orderId
    });
  }
});

module.exports = router;
