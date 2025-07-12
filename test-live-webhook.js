const crypto = require('crypto');
require('dotenv').config();

// Test your live webhook endpoint
async function testLiveWebhook() {
  const clientSecret = process.env.x_client_secret;
  
  if (!clientSecret) {
    console.error('❌ Client secret not found in .env file!');
    return;
  }
  
  console.log('✅ Client secret loaded from .env file');
  console.log('📏 Secret length:', clientSecret.length);
  console.log('🔑 Secret preview:', clientSecret.substring(0, 10) + '...');
  
  // Generate realistic webhook data
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const webhookData = {
    type: "SETTLEMENT_SUCCESS",
    event_time: new Date().toISOString(),
    data: {
      settlement_id: "LIVE_SETTLEMENT_" + Date.now(),
      payment_from: new Date(Date.now() - 24*60*60*1000).toISOString(),
      payment_till: new Date().toISOString(),
      utr: "LIVE_UTR_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      settled_on: new Date().toISOString().split('T')[0],
      status: "SUCCESS",
      settlement_amount: 5000.00
    }
  };
  
  const rawBody = JSON.stringify(webhookData);
  const message = timestamp + rawBody;
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
  
  console.log('\n=== Live Webhook Test Data ===');
  console.log('🌐 Webhook URL: https://yourdomain.com/api/webhook/settlementStatus');
  console.log('📅 Timestamp:', timestamp);
  console.log('🔐 Signature:', signature);
  console.log('📦 Body:', rawBody);
  
  console.log('\n=== Test Command ===');
  console.log('curl -X POST https://yourdomain.com/api/webhook/settlementStatus \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log(`  -H "x-webhook-signature: ${signature}" \\`);
  console.log(`  -H "x-webhook-timestamp: ${timestamp}" \\`);
  console.log(`  -d '${rawBody}'`);
  
  console.log('\n=== Expected Results ===');
  console.log('✅ If everything is configured correctly:');
  console.log('   - Signature verification should PASS');
  console.log('   - Settlement data should be processed');
  console.log('   - No time conversion errors');
  console.log('   - Email notification sent');
  
  console.log('\n=== Monitoring ===');
  console.log('📊 Check your server logs for:');
  console.log('   - "✅ Webhook signature verified successfully"');
  console.log('   - "Settlement webhook processed successfully"');
  console.log('   - "Settlement reconciliation: X transactions marked as settled"');
}

// Test signature verification with .env data
function testSignatureWithEnv() {
  const { Cashfree } = require('./allControllers/paymentControllers/cashfreeSignature');
  
  const clientSecret = process.env.x_client_secret;
  if (!clientSecret) {
    console.error('❌ Client secret not found!');
    return;
  }
  
  // Set the client secret
  Cashfree.XClientSecret = clientSecret;
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify({
    type: "SETTLEMENT_SUCCESS",
    data: { test: "live_data" }
  });
  
  const message = timestamp + rawBody;
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
  
  console.log('\n=== Testing with .env Data ===');
  console.log('Generated Signature:', signature);
  
  try {
    const result = Cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    console.log('✅ Signature verification PASSED with .env data!');
    console.log('🎯 Your webhook is ready for live production!');
  } catch (error) {
    console.log('❌ Signature verification FAILED:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Testing Live Webhook Setup...\n');
  testLiveWebhook();
  testSignatureWithEnv();
}

module.exports = { testLiveWebhook, testSignatureWithEnv }; 