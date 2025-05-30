const express=require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();
const { sessionIdGenerator,getOrderStatus,getPaymentStatus, getSettlementStatus, getSettlementByCfPaymentId, getOrderByTrainingId, webhookSettlementStatus} = require('../allControllers/paymentControllers/cashfreeSessionIdController');

// Configure bodyParser for all routes except webhook
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

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
    // Store the raw body as a string for signature verification
    req.rawBody = req.body.toString('utf8');
    next();
  },
  webhookSettlementStatus
);

module.exports = router;