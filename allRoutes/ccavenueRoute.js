const express = require("express");
const router = express.Router();
const {
  generateCCAvenueOrder,
  handleCCAvenueResponse,
  getCCAvenueOrderStatus,
  postReq 
} = require("../allControllers/paymentControllers/ccavenueController");

// router.post("/generate-ccavenue-order", generateCCAvenueOrder);
// router.post("/ccavResponseHandler",postReq );
// router.get("/ccavenue-order-status/:order_id", getCCAvenueOrderStatus);


module.exports = router;
