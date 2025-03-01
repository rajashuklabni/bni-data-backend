// allRoutes/elvoiceRoutes.js
const express = require("express");
const router = express.Router();
const { getToken, generateIRN, cancelIRN, getGstDetails  } = require("../allControllers/paymentControllers/elvoiceController");

// POST endpoint to generate an e-invoice
router.post("/get-token", getToken);
router.post('/generate-irn', async (req, res) => {
    await generateIRN(req, res);
  });
router.post("/cancel-irn", async (req, res) => {
    await cancelIRN(req, res);
});

// New Route for Fetching GST Details
router.get("/get-gst-details/:gstNo", async (req, res) => {
  await getGstDetails(req, res);
});
module.exports = router;
