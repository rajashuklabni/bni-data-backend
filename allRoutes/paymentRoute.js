const express=require('express');
const router = express.Router();
const { sessionIdGenerator,getOrderStatus,getPaymentStatus } = require('../allControllers/paymentControllers/cashfreeSessionIdController');



router.post('/generate-cashfree-session',sessionIdGenerator);
router.get('/getCashfreeOrderDataAndVerifyPayment/:order_id',getOrderStatus)
router.get('/orders/:order_id/paymentStatus',getPaymentStatus)


module.exports = router;