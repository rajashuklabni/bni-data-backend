const express=require('express');
const router = express.Router();
const { sessionIdGenerator,getOrderStatus,getpaymentData } = require('../allControllers/paymentControllers/cashfreeSessionIdController');



router.post('/generate-cashfree-session',sessionIdGenerator);
router.get('/getCashfreeOrderDataAndVerifyPayment/:order_id',getOrderStatus)


module.exports = router;