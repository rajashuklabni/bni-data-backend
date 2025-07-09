const crypto = require('crypto');
const axios = require('axios');

// Sample webhook payload (similar to Cashfree's format)
const webhookPayload = {
  "data": {
    "settlement": {
      "settlement_id": "TEST_SETTLEMENT_123",
      "payment_from": "2024-01-01 00:00:00",
      "payment_till": "2024-01-01 23:59:59",
      "utr": "TEST_UTR_123456",
      "settled_on": "2024-01-02 10:00:00",
      "status": "SUCCESS",
      "settlement_amount": 1000.00
    }
  },
  "type": "SETTLEMENT_SUCCESS",
  "event_time": "2024-01-02T10:00:00Z"
};

// Test payload (for Cashfree test webhooks)
const testPayload = {
  "data": {
    "test_object": {
      "test_key": "test_value"
    }
  }
};

// Function to generate webhook signature (simulating Cashfree's signature)
function generateWebhookSignature(payload, timestamp, clientSecret) {
  const message = timestamp + JSON.stringify(payload);
  return crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('hex');
}

// Function to test webhook
async function testWebhook() {
  const baseUrl = 'http://localhost:5000';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // Use your actual client secret from environment
  const clientSecret = process.env.x_client_secret || 'test_secret_key';
  
  console.log('🧪 Testing Webhook Endpoints...\n');
  
  // Test 1: Test endpoint (no signature required)
  console.log('1️⃣ Testing /webhook/test endpoint...');
  try {
    const testResponse = await axios.post(`${baseUrl}/api/webhook/test`, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Test endpoint response:', testResponse.data);
  } catch (error) {
    console.error('❌ Test endpoint error:', error.response?.data || error.message);
  }
  
  console.log('\n2️⃣ Testing /webhook/settlementStatus endpoint...');
  
  // Test 2: Settlement webhook with signature
  try {
    const signature = generateWebhookSignature(webhookPayload, timestamp, clientSecret);
    
    const settlementResponse = await axios.post(`${baseUrl}/api/webhook/settlementStatus`, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      }
    });
    
    console.log('✅ Settlement webhook response:', settlementResponse.data);
  } catch (error) {
    console.error('❌ Settlement webhook error:', error.response?.data || error.message);
  }
  
  console.log('\n3️⃣ Testing with curl commands...');
  console.log('\n📋 Manual curl commands you can run:');
  console.log('\nTest endpoint:');
  console.log(`curl -X POST ${baseUrl}/api/webhook/test \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify(testPayload)}'`);
  
  console.log('\nSettlement webhook (with signature):');
  console.log(`curl -X POST ${baseUrl}/api/webhook/settlementStatus \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "x-webhook-signature: ${generateWebhookSignature(webhookPayload, timestamp, clientSecret)}" \\`);
  console.log(`  -H "x-webhook-timestamp: ${timestamp}" \\`);
  console.log(`  -d '${JSON.stringify(webhookPayload)}'`);
}

// Run the test
testWebhook().catch(console.error); 