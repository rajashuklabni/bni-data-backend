# Cashfree Webhook Troubleshooting Guide

## Issues Identified

### 1. Webhook Signature Verification Failed
**Error:** `Generated signature and received signature did not match`

**Causes:**
- Incorrect client secret configuration
- Wrong signature generation algorithm
- Request body modification before verification
- Environment variable mismatch

**Solutions:**

#### A. Verify Environment Configuration
```bash
# Check if x_client_secret is set correctly
echo $x_client_secret

# In your .env file, ensure:
x_client_secret=your_actual_cashfree_webhook_secret
```

#### B. Verify Client Secret in Cashfree Dashboard
1. Log into your Cashfree Merchant Dashboard
2. Go to Settings → Webhooks
3. Copy the exact webhook secret
4. Update your environment variable

#### C. Test Signature Verification
```bash
# Run the test script
node test-webhook-signature.js
```

#### D. Check Webhook Headers
Ensure your webhook endpoint receives these headers:
- `x-webhook-signature`: The signature to verify
- `x-webhook-timestamp`: The timestamp used in signature generation

### 2. Time Format Conversion Error
**Error:** `Cannot read properties of undefined (reading 'split')`

**Causes:**
- `payment_from` or `payment_till` values are undefined/null
- Invalid time format from Cashfree
- Missing data in webhook payload

**Solutions:**

#### A. Enhanced Error Handling
The code now includes better validation:
- Checks for undefined/null values
- Validates string type before processing
- Provides detailed error logging

#### B. Fallback Processing
When time conversion fails, the system:
- Uses a broader date range (24 hours before/after)
- Continues processing without time constraints
- Logs the issue for investigation

## Debugging Steps

### 1. Enable Detailed Logging
```javascript
// Add to your webhook endpoint
console.log('Webhook Headers:', req.headers);
console.log('Webhook Body:', req.body.toString());
console.log('Content-Type:', req.headers['content-type']);
```

### 2. Test with Sample Data
```bash
# Use the test script with actual webhook data
node test-webhook-signature.js
```

### 3. Verify Webhook URL
Ensure your webhook URL is correctly configured in Cashfree:
- URL: `https://yourdomain.com/api/webhook/settlementStatus`
- Method: POST
- Content-Type: application/json

### 4. Check Network Connectivity
```bash
# Test if Cashfree can reach your endpoint
curl -X POST https://yourdomain.com/api/webhook/settlementStatus \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Environment Configuration

### Required Environment Variables
```env
# Cashfree Configuration
x_client_secret=your_webhook_secret_here
x_client_id=your_client_id_here
x_api_version=2024-01-01

# Environment
NODE_ENV=production  # or development for testing
```

### Development vs Production
- **Development**: Webhooks are processed even if signature verification fails
- **Production**: Webhooks are rejected if signature verification fails

## Common Issues and Fixes

### Issue 1: Signature Always Fails
**Symptoms:** Every webhook fails signature verification

**Fix:**
1. Verify client secret is correct
2. Check if secret has been rotated
3. Ensure no middleware modifies the request body

### Issue 2: Time Conversion Errors
**Symptoms:** Settlement reconciliation fails

**Fix:**
1. Check webhook payload structure
2. Verify time format from Cashfree
3. Use fallback date range processing

### Issue 3: Webhook Not Received
**Symptoms:** No webhook calls reaching your endpoint

**Fix:**
1. Verify webhook URL in Cashfree dashboard
2. Check server firewall settings
3. Ensure endpoint is publicly accessible

## Monitoring and Alerts

### Log Monitoring
Monitor these log patterns:
- `✅ Webhook signature verified successfully`
- `❌ Webhook signature verification failed`
- `Error converting time format`

### Email Notifications
The system sends email notifications for:
- Successful webhook processing
- Signature verification failures
- Settlement reconciliation issues

## Testing Webhook Locally

### Using ngrok
```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm start

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL in Cashfree webhook configuration
```

### Manual Testing
```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhook/settlementStatus \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test_signature" \
  -H "x-webhook-timestamp: 1640995200" \
  -d '{"type": "SETTLEMENT_SUCCESS", "data": {...}}'
```

## Best Practices

1. **Always verify webhook signatures** in production
2. **Log all webhook events** for debugging
3. **Handle webhook failures gracefully**
4. **Use idempotent operations** for webhook processing
5. **Monitor webhook delivery** and retry mechanisms
6. **Keep webhook secrets secure** and rotate regularly

## Support

If issues persist:
1. Check Cashfree documentation for latest webhook specifications
2. Contact Cashfree support with webhook delivery issues
3. Review server logs for detailed error information
4. Test with sample webhook data provided by Cashfree 