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

// CORS middleware - Allow all origins in development for easier testing
const allowedOrigins = process.env.NODE_ENV === 'production' ? [
  process.env.FRONTEND_URL || 'https://www.wallineex.store/',
  process.env.FRONTEND_URL_PRODUCTION || 'https://www.wallineex.store/',
  'https://www.wallineex.store/'
] : true; // Allow all origins in development

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-timestamp', 'x-webhook-signature'],
  optionsSuccessStatus: 200 // For legacy browser support
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
