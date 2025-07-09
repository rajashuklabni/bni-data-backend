# Webhook Testing Guide

## 🧪 Local Testing Methods

### Method 1: Using the Test Script
```bash
# Run the test script
node test-webhook.js
```

### Method 2: Manual curl Commands

#### Test Endpoint (No Signature Required)
```bash
curl -X POST http://localhost:5000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"data":{"test_object":{"test_key":"test_value"}}}'
```

#### Settlement Webhook (With Signature)
```bash
curl -X POST http://localhost:5000/api/webhook/settlementStatus \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: YOUR_SIGNATURE" \
  -H "x-webhook-timestamp: TIMESTAMP" \
  -d '{
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
  }'
```

### Method 3: Using ngrok for External Testing

1. **Install ngrok** (if not already installed):
```bash
npm install -g ngrok
```

2. **Start your server**:
```bash
node connect.js
```

3. **Expose your local server**:
```bash
ngrok http 5000
```

4. **Use the ngrok URL** in Cashfree webhook configuration:
   - Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)
   - Add `/api/webhook/settlementStatus` to the end
   - Configure this URL in your Cashfree dashboard

### Method 4: Using Postman

1. **Create a new POST request**
2. **URL**: `http://localhost:5000/api/webhook/settlementStatus`
3. **Headers**:
   - `Content-Type: application/json`
   - `x-webhook-signature: YOUR_SIGNATURE`
   - `x-webhook-timestamp: TIMESTAMP`
4. **Body** (raw JSON):
```json
{
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
}
```

## 🔧 Troubleshooting

### Signature Verification Issues
- Ensure your `x_client_secret` environment variable is set correctly
- Check that the signature generation matches Cashfree's algorithm
- Verify timestamp format (Unix timestamp in seconds)

### CORS Issues
- Your server already has CORS configured for Cashfree domains
- For local testing, CORS should not be an issue

### Database Connection Issues
- Ensure your database is running and accessible
- Check environment variables for database connection

## 📊 Expected Responses

### Successful Test Endpoint
```json
{
  "message": "Test webhook received",
  "bodyType": "object",
  "isBuffer": false,
  "bodyLength": 50,
  "headers": {...}
}
```

### Successful Settlement Webhook
```json
{
  "message": "Webhook processed successfully",
  "settlement_id": "TEST_SETTLEMENT_123",
  "utr": "TEST_UTR_123456"
}
```

### Error Responses
- `400`: Invalid payload structure
- `401`: Invalid webhook signature
- `500`: Internal server error

## 🚀 Production Testing

1. **Use ngrok** to expose your local server
2. **Configure webhook URL** in Cashfree dashboard
3. **Monitor logs** in your server console
4. **Check database** for settlement records
5. **Verify email notifications** are sent

## 📝 Logs to Monitor

Watch for these log messages in your server console:
- `=== Webhook Handler Debug ===`
- `Webhook signature verified successfully`
- `Settlement webhook processed successfully`
- `Settlement webhook notification email sent successfully` 