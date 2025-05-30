const express=require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const {webhookSettlementStatus} = require('../allControllers/paymentControllers/webhookController');

// Configure the webhook route to handle raw bodies
router.post('/webhook/settlementStatus',
  (req, res, next) => {
    console.log('Webhook middleware - Content-Type:', req.headers['content-type']);
    console.log('Webhook middleware - Body type:', typeof req.body);
    console.log('Webhook middleware - Is Buffer:', Buffer.isBuffer(req.body));
    next();
  },
  webhookSettlementStatus
);

module.exports = router;