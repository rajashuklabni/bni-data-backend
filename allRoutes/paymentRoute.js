const express=require('express');
const router = express.Router();
const { sessionIdGenerator } = require('../allControllers/paymentControllers/cashfreeSessionIdController');



router.post('/generate-cashfree-session',sessionIdGenerator)


module.exports = router;