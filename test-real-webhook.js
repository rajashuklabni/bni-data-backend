const crypto = require('crypto');

// Test with realistic webhook data
function testRealWebhook() {
  // Realistic webhook data (you can replace with actual data from your logs)
  const timestamp = Math.floor(Date.now() / 1000).toString(); // Current timestamp
  const rawBody = JSON.stringify({
    type: "SETTLEMENT_SUCCESS",
    event_time: "2025-01-09T10:30:00+05:30",
    data: {
      settlement_id: "SETTLEMENT_20250109_001",
      payment_from: "2025-01-08T00:00:00+05:30",
      payment_till: "2025-01-08T23:59:59+05:30",
      utr: "UTR123456789012345",
      settled_on: "2025-01-09",
      status: "SUCCESS",
      settlement_amount: 15000.50
    }
  });
  
  const clientSecret = process.env.x_client_secret;
  
  if (!clientSecret) {
    console.error('❌ x_client_secret environment variable not set!');
    console.log('Please set it with: export x_client_secret="your_secret"');
    return;
  }
  
  console.log('=== Real Webhook Signature Test ===');
  console.log('Timestamp:', timestamp);
  console.log('Raw Body:', rawBody);
  console.log('Client Secret Length:', clientSecret.length);
  console.log('Client Secret Preview:', clientSecret.substring(0, 10) + '...');
  
  // Generate signature using Cashfree's method
  const message = timestamp + rawBody;
  const generatedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
  
  console.log('\n=== Generated Data ===');
  console.log('Generated Signature:', generatedSignature);
  console.log('Message Length:', message.length);
  console.log('Message Preview:', message.substring(0, 100) + '...');
  
  console.log('\n=== How to Test ===');
  console.log('1. Use this signature in your webhook test:');
  console.log(`   x-webhook-signature: ${generatedSignature}`);
  console.log(`   x-webhook-timestamp: ${timestamp}`);
  console.log('\n2. Send this body to your webhook endpoint:');
  console.log(rawBody);
  
  console.log('\n=== Expected Result ===');
  console.log('✅ If Cashfree sends this exact data, signature verification should pass!');
}

// Test signature verification function
function testSignatureVerification() {
  const { Cashfree } = require('./allControllers/paymentControllers/cashfreeSignature');
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify({
    type: "SETTLEMENT_SUCCESS",
    data: { test: "data" }
  });
  
  const clientSecret = process.env.x_client_secret;
  
  if (!clientSecret) {
    console.error('❌ Client secret not set');
    return;
  }
  
  // Set the client secret
  Cashfree.XClientSecret = clientSecret;
  
  // Generate signature
  const message = timestamp + rawBody;
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
  
  console.log('\n=== Testing Signature Verification Function ===');
  console.log('Generated Signature:', signature);
  console.log('Timestamp:', timestamp);
  console.log('Raw Body:', rawBody);
  
  try {
    const result = Cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    console.log('✅ Signature verification PASSED!');
    console.log('Webhook Event:', result);
  } catch (error) {
    console.log('❌ Signature verification FAILED:', error.message);
  }
}

// Run tests
if (require.main === module) {
  testRealWebhook();
  testSignatureVerification();
}

module.exports = { testRealWebhook, testSignatureVerification }; 