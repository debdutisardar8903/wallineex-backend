// Security middleware for the Cashfree server

const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General API rate limiting - More lenient in development
const generalRateLimit = createRateLimit(
  process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 min prod, 5 min dev
  process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 prod, 1000 dev
  'Too many requests from this IP, please try again later'
);

// Payment operations rate limiting (more restrictive)
const paymentRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // limit each IP to 10 payment requests per windowMs
  'Too many payment requests from this IP, please try again later'
);

// Webhook rate limiting
const webhookRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  50, // limit each IP to 50 webhook requests per windowMs
  'Too many webhook requests from this IP'
);

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for required headers
  const contentType = req.get('Content-Type');
  
  if (req.method === 'POST' && !contentType) {
    return res.status(400).json({
      success: false,
      error: 'Content-Type header is required'
    });
  }
  
  if (req.method === 'POST' && !contentType.includes('application/json')) {
    // Allow raw body for webhooks
    if (!req.originalUrl.includes('/webhook')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json'
      });
    }
  }
  
  next();
};

// CORS validation middleware
const validateOrigin = (req, res, next) => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'https://www.wallineex.store/'
  ];
  
  // Allow requests without origin (like Postman, server-to-server)
  if (!origin) {
    return next();
  }
  
  if (!allowedOrigins.includes(origin)) {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return res.status(403).json({
      success: false,
      error: 'Origin not allowed'
    });
  }
  
  next();
};

// Request size limiting
const requestSizeLimit = (req, res, next) => {
  const contentLength = req.get('Content-Length');
  const maxSize = 1024 * 1024; // 1MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large'
    });
  }
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add cache control for API responses
  if (req.originalUrl.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// IP whitelist middleware (optional, for production)
const ipWhitelist = (req, res, next) => {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];
  
  if (allowedIPs.length === 0) {
    return next(); // No IP restriction if not configured
  }
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!allowedIPs.includes(clientIP)) {
    console.warn(`Blocked request from IP: ${clientIP}`);
    return res.status(403).json({
      success: false,
      error: 'IP not allowed'
    });
  }
  
  next();
};

// Webhook signature validation middleware
const validateWebhookSignature = (req, res, next) => {
  if (!req.originalUrl.includes('/webhook')) {
    return next();
  }
  
  const timestamp = req.get('x-webhook-timestamp');
  const signature = req.get('x-webhook-signature');
  
  if (!timestamp || !signature) {
    return res.status(401).json({
      success: false,
      error: 'Missing webhook signature headers'
    });
  }
  
  // Check timestamp freshness (within 5 minutes)
  const webhookTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - webhookTime);
  
  if (timeDiff > 300) { // 5 minutes
    return res.status(401).json({
      success: false,
      error: 'Webhook timestamp too old'
    });
  }
  
  next();
};

module.exports = {
  generalRateLimit,
  paymentRateLimit,
  webhookRateLimit,
  validateRequest,
  validateOrigin,
  requestSizeLimit,
  securityHeaders,
  ipWhitelist,
  validateWebhookSignature
};
