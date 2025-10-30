const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

// Import middleware
const { 
  generalRateLimit, 
  paymentRateLimit, 
  securityHeaders, 
  validateRequest,
  requestSizeLimit 
} = require('./middleware/security');
const { logApiAccess, logServerStart } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Render deployment (more secure configuration)
// Trust only the first proxy (Render's load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(requestSizeLimit);

// Logging middleware
app.use(logApiAccess);

// Rate limiting - More lenient in development
if (process.env.NODE_ENV === 'production') {
  app.use('/api/create-order', paymentRateLimit);
  app.use('/api/verify-payment', paymentRateLimit);
  app.use('/api', generalRateLimit);
} else {
  // Development: Apply only general rate limiting with higher limits
  app.use('/api', generalRateLimit);
}

// CORS middleware - More flexible configuration for debugging
const allowedOrigins = process.env.NODE_ENV === 'production' ? [
  process.env.FRONTEND_URL || 'https://www.wallineex.store/',
  process.env.FRONTEND_URL_PRODUCTION || 'https://www.wallineex.store/',
  'https://www.wallineex.store/',
  'https://www.wallineex.store',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
] : [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://www.wallineex.store/',
  'https://www.wallineex.store',
  'https://wallineex-store.vercel.app',
  // Allow any localhost port for development
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/
];

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (Array.isArray(allowedOrigins)) {
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
    } else if (allowedOrigins === true) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-webhook-timestamp', 
    'x-webhook-signature',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false // Pass control to the next handler
}));

// Body parsing middleware
app.use('/api/payment-webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request validation
app.use(validateRequest);

// Import routes
const paymentRoutes = require('./routes/payment');

// Use routes
app.use('/api', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Wallineex Cashfree Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: process.env.NODE_ENV === 'production' ? 'restricted' : 'open'
  });
});

// Common typo redirects
app.get('/helth', (req, res) => {
  res.redirect(301, '/health');
});

app.get('/', (req, res) => {
  res.json({
    message: 'Wallineex Cashfree Server API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      test: '/test',
      api: '/api/*'
    },
    documentation: 'https://github.com/debdutisardar8903/wallineex-backend'
  });
});

// Test endpoint for CORS debugging
app.get('/test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// CORS test endpoint with POST method
app.post('/test-cors', (req, res) => {
  console.log('🧪 CORS POST test received');
  console.log('🧪 Origin:', req.get('Origin'));
  console.log('🧪 Body:', req.body);
  
  res.json({
    message: 'CORS POST test successful',
    origin: req.get('Origin'),
    body: req.body,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Development endpoint to reset rate limits
if (process.env.NODE_ENV !== 'production') {
  app.post('/dev/reset-limits', (req, res) => {
    // This is a simple endpoint for development
    // In a real implementation, you'd clear the rate limit store
    res.json({
      message: 'Rate limits reset (development only)',
      timestamp: new Date().toISOString()
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  logServerStart(PORT, process.env.NODE_ENV || 'development');
});

module.exports = app;
