// Logging utilities for payment operations

const logRequest = (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔵 [${timestamp}] ${operation} REQUEST:`);
  
  // Sanitize sensitive data for logging
  const sanitizedData = sanitizeLogData(data);
  console.log(JSON.stringify(sanitizedData, null, 2));
};

const logResponse = (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🟢 [${timestamp}] ${operation} RESPONSE:`);
  
  // Sanitize sensitive data for logging
  const sanitizedData = sanitizeLogData(data);
  console.log(JSON.stringify(sanitizedData, null, 2));
};

const logError = (operation, error) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔴 [${timestamp}] ${operation} ERROR:`);
  
  if (error.response) {
    // Axios error with response
    console.log('Status:', error.response.status);
    console.log('Data:', JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    // Axios error without response
    console.log('No response received:', error.message);
  } else {
    // Other errors
    console.log('Error:', error.message);
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Stack trace:', error.stack);
  }
};

const logWebhook = (eventType, orderId, status) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 [${timestamp}] WEBHOOK: ${eventType}`);
  console.log(`Order ID: ${orderId}`);
  console.log(`Status: ${status}`);
};

// Sanitize sensitive data before logging
const sanitizeLogData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'customerPhone', 'customer_phone', 'phone',
    'customerEmail', 'customer_email', 'email',
    'x-client-secret', 'secretKey', 'secret',
    'x-webhook-signature', 'signature'
  ];
  
  const sanitized = { ...data };
  
  // Recursively sanitize nested objects
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const result = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        // Mask sensitive data
        if (typeof value === 'string') {
          if (key.toLowerCase().includes('email')) {
            result[key] = maskEmail(value);
          } else if (key.toLowerCase().includes('phone')) {
            result[key] = maskPhone(value);
          } else {
            result[key] = '***MASKED***';
          }
        } else {
          result[key] = '***MASKED***';
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };
  
  return sanitizeObject(sanitized);
};

// Mask email for logging
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return email;
  
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  const maskedUsername = username.length > 2 
    ? username.substring(0, 2) + '*'.repeat(username.length - 2)
    : username;
    
  return `${maskedUsername}@${domain}`;
};

// Mask phone number for logging
const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 4) return phone;
  
  return cleanPhone.substring(0, 2) + '*'.repeat(cleanPhone.length - 4) + cleanPhone.slice(-2);
};

// Log server startup
const logServerStart = (port, environment) => {
  console.log('\n' + '-'.repeat(80));
  console.log('-'.repeat(80));
  console.log('\x1b[1m\x1b[36m');
  console.log('  🚀  ██╗    ██╗ █████╗ ██╗     ██╗     ██╗███╗   ██╗███████╗███████╗██╗  ██╗');
  console.log('      ██║    ██║██╔══██╗██║     ██║     ██║████╗  ██║██╔════╝██╔════╝╚██╗██╔╝');
  console.log('      ██║ █╗ ██║███████║██║     ██║     ██║██╔██╗ ██║█████╗  █████╗   ╚███╔╝ ');
  console.log('      ██║███╗██║██╔══██║██║     ██║     ██║██║╚██╗██║██╔══╝  ██╔══╝   ██╔██╗ ');
  console.log('      ╚███╔███╔╝██║  ██║███████╗███████╗██║██║ ╚████║███████╗███████╗██╔╝ ██╗');
  console.log('       ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝  ╚═╝');
  console.log('');
  console.log('       ██████╗ █████╗ ███████╗██╗  ██╗███████╗██████╗ ███████╗███████╗');
  console.log('      ██╔════╝██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝');
  console.log('      ██║     ███████║███████╗███████║█████╗  ██████╔╝█████╗  █████╗  ');
  console.log('      ██║     ██╔══██║╚════██║██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ');
  console.log('      ╚██████╗██║  ██║███████║██║  ██║██║     ██║  ██║███████╗███████╗');
  console.log('       ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝');
  console.log('\x1b[0m');
  console.log('\x1b[1m\x1b[32m' + '                    *** SERVER STARTED SUCCESSFULLY ***' + '\x1b[0m');
  console.log('\x1b[1m\x1b[33m' + '                         🚀 READY FOR PAYMENTS 🚀' + '\x1b[0m');
  console.log('-'.repeat(80));
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log(`🌐 Port: ${port}`);
  console.log(`🔧 Environment: ${environment}`);
  console.log(`📊 Node Version: ${process.version}`);
  console.log(`🔗 Health Check: http://localhost:${port}/health`);
  console.log(`🧪 Test Endpoint: http://localhost:${port}/test`);
  console.log('-'.repeat(80));
  console.log('-'.repeat(80) + '\n');
};

// Log API endpoint access
const logApiAccess = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`📡 [${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  // Log response when it finishes
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 [${timestamp}] ${method} ${url} - Status: ${res.statusCode}`);
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  logRequest,
  logResponse,
  logError,
  logWebhook,
  logServerStart,
  logApiAccess,
  sanitizeLogData,
  maskEmail,
  maskPhone
};
