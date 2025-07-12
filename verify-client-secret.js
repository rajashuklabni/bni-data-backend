const crypto = require('crypto');
require('dotenv').config();

// Verify client secret format and validity
function verifyClientSecret() {
  const clientSecret = process.env.x_client_secret;
  
  console.log('🔍 Verifying Client Secret for Live Production...\n');
  
  if (!clientSecret) {
    console.error('❌ Client secret not found in .env file!');
    return;
  }
  
  console.log('📏 Secret Length:', clientSecret.length);
  console.log('🔑 Secret Preview:', clientSecret.substring(0, 20) + '...');
  console.log('🔑 Secret Format:', clientSecret.substring(0, 10));
  
  // Check if it's a production secret
  if (clientSecret.startsWith('cfsk_ma_prod_')) {
    console.log('✅ Format: PRODUCTION secret (cfsk_ma_prod_)');
  } else if (clientSecret.startsWith('cfsk_ma_test_')) {
    console.log('⚠️  Format: TEST secret (cfsk_ma_test_) - NOT for production!');
  } else {
    console.log('❓ Format: Unknown format');
  }
  
  // Test signature generation
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const testBody = JSON.stringify({ test: "data" });
  const message = timestamp + testBody;
  
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
  
  console.log('\n🧪 Signature Generation Test:');
  console.log('✅ Signature generated successfully:', signature.substring(0, 20) + '...');
  console.log('✅ Algorithm: HMAC-SHA256 + Base64');
  
  console.log('\n📋 Next Steps:');
  console.log('1. Log into Cashfree Merchant Dashboard');
  console.log('2. Go to Settings → Webhooks');
  console.log('3. Copy the webhook secret from there');
  console.log('4. Compare with your .env file');
  console.log('5. If different, update your .env file');
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('- If secret is different, your webhook will FAIL');
  console.log('- Cashfree may rotate secrets periodically');
  console.log('- Always use the latest secret from dashboard');
}

// Test with sample webhook data
function testWithSampleData() {
  const clientSecret = process.env.x_client_secret;
  
  console.log('\n🧪 Testing with Sample Webhook Data...');
  
  // Sample data that Cashfree might send
  const sampleWebhook = {
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
  };
  
  const timestamp = "1640995200";
  const rawBody = JSON.stringify(sampleWebhook);
  const message = timestamp + rawBody;
  
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
  
  console.log('📅 Timestamp:', timestamp);
  console.log('📦 Sample Body:', rawBody.substring(0, 100) + '...');
  console.log('🔐 Generated Signature:', signature);
  
  console.log('\n💡 To verify this signature:');
  console.log('1. Use this exact data in Cashfree dashboard test');
  console.log('2. Compare the signature they generate');
  console.log('3. If they match, your secret is correct!');
}

// Run verification
if (require.main === module) {
  verifyClientSecret();
  testWithSampleData();
}

module.exports = { verifyClientSecret, testWithSampleData }; 