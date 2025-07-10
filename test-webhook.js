const crypto = require('crypto');

// Test webhook signature verification
function testWebhookSignature() {
  console.log('=== Testing Webhook Signature Verification ===');
  
  // Sample webhook data (replace with actual data from Cashfree)
  const timestamp = '1640995200';
  const rawBody = JSON.stringify({
    type: 'SETTLEMENT_SUCCESS',
    event_time: '2024-01-01T00:00:00Z',
    data: {
      settlement: {
        settlement_id: 'TEST_SETTLEMENT_123',
        utr: 'TEST_UTR_456',
        settled_on: '2024-01-01',
        status: 'SUCCESS',
        settlement_amount: 1000.00
      }
    }
  });
  
  // Your client secret (replace with actual secret)
  const clientSecret = process.env.x_client_secret || 'test_secret';
  
  console.log('Timestamp:', timestamp);
  console.log('Raw body:', rawBody);
  console.log('Client secret length:', clientSecret.length);
  
  // Generate signature
  const body = timestamp + rawBody;
  const generatedSignature = crypto
    .createHmac("sha256", clientSecret)
    .update(body)
    .digest("base64");
  
  console.log('Generated signature:', generatedSignature);
  console.log('=== End Test ===');
  
  return {
    timestamp,
    rawBody,
    generatedSignature,
    body
  };
}

// Test the signature verification
if (require.main === module) {
  testWebhookSignature();
}

module.exports = { testWebhookSignature }; 