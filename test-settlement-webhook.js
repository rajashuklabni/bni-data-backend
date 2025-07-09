const axios = require('axios');

// Test settlement payload
const settlementPayload = {
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

async function testSettlementWebhook() {
  console.log('🧪 Testing Settlement Webhook...\n');
  
  try {
    const response = await axios.post('http://localhost:5000/api/webhook/settlementStatus', settlementPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'test_signature_for_testing',
        'x-webhook-timestamp': Math.floor(Date.now() / 1000).toString()
      }
    });
    
    console.log('✅ Response:', response.data);
    console.log('📊 Status Code:', response.status);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.log('📊 Status Code:', error.response?.status);
  }
}

// Run test
testSettlementWebhook(); 