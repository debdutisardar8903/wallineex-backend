// Validation utilities for payment requests

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  // Indian phone number validation (10 digits, starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+91/, '');
  return phoneRegex.test(cleanPhone);
};

const validateOrderAmount = (amount) => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount > 0 && numAmount <= 500000; // Max 5 lakh INR
};

const validateOrderId = (orderId) => {
  // Should match the format: WX123456789105678
  const orderIdRegex = /^WX\d{13}$/;
  return orderIdRegex.test(orderId);
};

const validateOrderData = (data) => {
  const errors = [];
  
  // Required fields validation
  const requiredFields = [
    'orderId', 'orderAmount', 'customerName', 
    'customerEmail', 'customerPhone', 'returnUrl'
  ];
  
  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${field} is required`);
    }
  }
  
  // Specific field validations
  if (data.orderId && !validateOrderId(data.orderId)) {
    errors.push('Invalid order ID format. Should be WX followed by 13 digits');
  }
  
  if (data.orderAmount && !validateOrderAmount(data.orderAmount)) {
    errors.push('Invalid order amount. Should be between 1 and 500000 INR');
  }
  
  if (data.customerEmail && !validateEmail(data.customerEmail)) {
    errors.push('Invalid email format');
  }
  
  if (data.customerPhone && !validatePhoneNumber(data.customerPhone)) {
    errors.push('Invalid phone number. Should be 10 digits starting with 6-9');
  }
  
  if (data.customerName && data.customerName.length < 2) {
    errors.push('Customer name should be at least 2 characters long');
  }
  
  if (data.returnUrl && !isValidUrl(data.returnUrl)) {
    errors.push('Invalid return URL format');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

const validatePaymentVerification = (data) => {
  const errors = [];
  
  if (!data.orderId || data.orderId.trim() === '') {
    errors.push('Order ID is required for payment verification');
  }
  
  if (data.orderId && !validateOrderId(data.orderId)) {
    errors.push('Invalid order ID format');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Sanitize customer data
const sanitizeCustomerData = (data) => {
  return {
    customerName: data.customerName?.trim().substring(0, 100) || '',
    customerEmail: data.customerEmail?.trim().toLowerCase() || '',
    customerPhone: data.customerPhone?.replace(/\s+/g, '').replace(/^\+91/, '') || '',
    orderId: data.orderId?.trim() || '',
    orderAmount: parseFloat(data.orderAmount) || 0
  };
};

// Validate webhook data
const validateWebhookData = (data) => {
  const errors = [];
  
  if (!data.type) {
    errors.push('Webhook type is required');
  }
  
  if (!data.data) {
    errors.push('Webhook data is required');
  }
  
  if (data.data && !data.data.order) {
    errors.push('Order data is required in webhook');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

module.exports = {
  validateEmail,
  validatePhoneNumber,
  validateOrderAmount,
  validateOrderId,
  validateOrderData,
  validatePaymentVerification,
  validateWebhookData,
  sanitizeCustomerData,
  isValidUrl
};
