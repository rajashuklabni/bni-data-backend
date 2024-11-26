const express=require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();
const { sessionIdGenerator,getOrderStatus,getPaymentStatus, getSettlementWebhook} = require('../allControllers/paymentControllers/cashfreeSessionIdController');

router.post('/generate-cashfree-session',sessionIdGenerator);
router.get('/getCashfreeOrderDataAndVerifyPayment/:order_id',getOrderStatus)
router.get('/orders/:order_id/paymentStatus',getPaymentStatus)
app.use(bodyParser.raw({ type: 'application/json' }));

router.post('/webhook/cashfree',getSettlementWebhook)

module.exports = router;