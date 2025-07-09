const express=require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();
const { sessionIdGenerator,getOrderStatus,getPaymentStatus, getSettlementStatus, getSettlementByCfPaymentId, getOrderByTrainingId, webhookSettlementStatus} = require('../allControllers/paymentControllers/cashfreeSessionIdController');

router.post('/generate-cashfree-session',sessionIdGenerator);
router.get('/getCashfreeOrderDataAndVerifyPayment/:order_id',getOrderStatus)
router.get('/orders/:order_id/paymentStatus',getPaymentStatus)
router.get('/orders/:order_id/settlementStatus', getSettlementStatus);
router.get('/settlement/:cf_payment_id', getSettlementByCfPaymentId);
router.get('/getTrainingOrder/:training_id', getOrderByTrainingId);

// Configure the webhook route to handle raw bodies
router.post('/webhook/settlementStatus', 
  bodyParser.raw({ type: 'application/json' }), 
  (req, res, next) => {
    console.log('Webhook middleware - Content-Type:', req.headers['content-type']);
    console.log('Webhook middleware - Body type:', typeof req.body);
    console.log('Webhook middleware - Is Buffer:', Buffer.isBuffer(req.body));
    console.log('Webhook middleware - Raw body length:', req.body.length);
    console.log('Webhook middleware - Raw body preview:', req.body.toString('utf8').substring(0, 200) + '...');
    next();
  },
  webhookSettlementStatus
);

// Test endpoint for webhook signature verification
router.post('/webhook/test', 
  bodyParser.raw({ type: 'application/json' }), 
  (req, res) => {
    console.log('=== Test Webhook Endpoint ===');
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('Is Buffer:', Buffer.isBuffer(req.body));
    console.log('Raw body:', req.body.toString('utf8'));
    
    res.status(200).json({ 
      message: 'Test webhook received',
      bodyType: typeof req.body,
      isBuffer: Buffer.isBuffer(req.body),
      bodyLength: req.body.length,
      headers: req.headers
    });
  }
);

module.exports = router;