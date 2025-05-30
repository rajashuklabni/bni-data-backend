const express=require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();
const { sessionIdGenerator,getOrderStatus,getPaymentStatus, getSettlementStatus, getSettlementByCfPaymentId, getOrderByTrainingId, webhookSettlementStatus} = require('../allControllers/paymentControllers/cashfreeSessionIdController');

// Disable body parsing for the webhook route
router.use('/webhook/settlementStatus', (req, res, next) => {
  if (req.method === 'POST') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
});

router.post('/generate-cashfree-session',sessionIdGenerator);
router.get('/getCashfreeOrderDataAndVerifyPayment/:order_id',getOrderStatus)
router.get('/orders/:order_id/paymentStatus',getPaymentStatus)
router.get('/orders/:order_id/settlementStatus', getSettlementStatus);
router.get('/settlement/:cf_payment_id', getSettlementByCfPaymentId);
router.get('/getTrainingOrder/:training_id', getOrderByTrainingId);

// Configure the webhook route
router.post('/webhook/settlementStatus', 
  (req, res, next) => {
    console.log('Webhook middleware - Content-Type:', req.headers['content-type']);
    console.log('Webhook middleware - Raw body:', req.rawBody);
    next();
  },
  webhookSettlementStatus
);

module.exports = router;