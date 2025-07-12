const crypto = require('crypto');

// Test webhook signature verification
function testWebhookSignature() {
  // Sample webhook data (replace with actual values from your logs)
  const timestamp = '1640995200'; // Unix timestamp
  const rawBody = JSON.stringify({
    type: 'SETTLEMENT_SUCCESS',
    event_time: '2025-01-09T00:00:00+05:30',
    data: {
      settlement_id: 'TEST_SETTLEMENT_123',
      utr: 'TEST_UTR_456',
      settled_on: '2025-01-09',
      status: 'SUCCESS',
      settlement_amount: 1000.00
    }
  });
  
  // Your client secret (replace with actual value)
  const clientSecret = process.env.x_client_secret || 'your_client_secret_here';
  
  console.log('=== Webhook Signature Test ===');
  console.log('Timestamp:', timestamp);
  console.log('Raw Body:', rawBody);
  console.log('Client Secret Length:', clientSecret.length);
  console.log('Client Secret Preview:', clientSecret.substring(0, 10) + '...');
  
  // Generate signature using the same method as Cashfree
  const message = timestamp + rawBody;
  const generatedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
  
  console.log('Generated Signature:', generatedSignature);
  console.log('Message Length:', message.length);
  console.log('Message Preview:', message.substring(0, 100) + '...');
  
  // Test with a sample signature (replace with actual signature from webhook)
  const sampleSignature = 'sample_signature_here';
  console.log('Sample Signature:', sampleSignature);
  console.log('Signatures Match:', generatedSignature === sampleSignature);
  
  console.log('=== End Test ===');
}

// Test different signature formats
function testSignatureFormats() {
  const timestamp = '1640995200';
  const rawBody = '{"test": "data"}';
  const clientSecret = process.env.x_client_secret || 'test_secret';
  
  console.log('=== Testing Different Signature Formats ===');
  
  const formats = [
    { name: 'timestamp + rawBody (base64)', message: timestamp + rawBody, encoding: 'base64' },
    { name: 'rawBody only (base64)', message: rawBody, encoding: 'base64' },
    { name: 'timestamp + rawBody (hex)', message: timestamp + rawBody, encoding: 'hex' },
    { name: 'rawBody only (hex)', message: rawBody, encoding: 'hex' }
  ];
  
  formats.forEach((format, index) => {
    const signature = crypto
      .createHmac('sha256', clientSecret)
      .update(format.message)
      .digest(format.encoding);
    
    console.log(`Format ${index + 1}: ${format.name}`);
    console.log(`  Message: ${format.message}`);
    console.log(`  Signature: ${signature}`);
    console.log('');
  });
}

// Run tests
if (require.main === module) {
  console.log('Running webhook signature tests...\n');
  testWebhookSignature();
  console.log('\n');
  testSignatureFormats();
}

module.exports = { testWebhookSignature, testSignatureFormats }; 