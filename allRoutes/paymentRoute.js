const express=require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();
const { sessionIdGenerator,getOrderStatus,getPaymentStatus, getSettlementStatus} = require('../allControllers/paymentControllers/cashfreeSessionIdController');

router.post('/generate-cashfree-session',sessionIdGenerator);
router.get('/getCashfreeOrderDataAndVerifyPayment/:order_id',getOrderStatus)
router.get('/orders/:order_id/paymentStatus',getPaymentStatus)
router.get('/orders/:order_id/settlementStatus', getSettlementStatus);



module.exports = router;