const axios = require('axios');

class CashfreeConfig {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID;
    this.secretKey = process.env.CASHFREE_SECRET_KEY;
    this.apiVersion = process.env.CASHFREE_API_VERSION || '2023-08-01';
    this.environment = process.env.NODE_ENV || 'development';
    
    // Set base URL based on environment
    this.baseUrl = this.environment === 'production' 
      ? process.env.CASHFREE_BASE_URL_PRODUCTION || 'https://api.cashfree.com/pg'
      : process.env.CASHFREE_BASE_URL_SANDBOX || 'https://sandbox.cashfree.com/pg';
    
    this.validateConfig();
  }

  validateConfig() {
    if (!this.appId || !this.secretKey) {
      throw new Error('Cashfree APP_ID and SECRET_KEY are required');
    }
  }

  getHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-version': this.apiVersion,
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey
    };
  }

  getAxiosInstance() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: this.getHeaders(),
      timeout: 30000 // 30 seconds timeout
    });
  }

  // Generate signature for webhook verification
  generateSignature(rawBody, timestamp) {
    const crypto = require('crypto');
    const signatureData = timestamp + rawBody;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureData)
      .digest('base64');
  }

  // Verify webhook signature
  verifyWebhookSignature(rawBody, timestamp, receivedSignature) {
    const expectedSignature = this.generateSignature(rawBody, timestamp);
    return expectedSignature === receivedSignature;
  }
}

module.exports = new CashfreeConfig();
