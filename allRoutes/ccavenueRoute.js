const express = require("express");
const router = express.Router();
const {
  generateCCAvenueOrder,
  handleCCAvenueResponse,
  getCCAvenueOrderStatus,
} = require("../allControllers/paymentControllers/ccavenueController");

router.post("/generate-ccavenue-order", generateCCAvenueOrder);
router.post("/ccavenue-response", handleCCAvenueResponse);
router.get("/ccavenue-order-status/:order_id", getCCAvenueOrderStatus);

module.exports = router;
