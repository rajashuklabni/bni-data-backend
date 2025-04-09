// allRoutes/elvoiceRoutes.js
const express = require("express");
const router = express.Router();
const { getToken, generateIRN, cancelIRN, getGstDetails, getMultipleGstDetails  } = require("../allControllers/paymentControllers/elvoiceController");

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

router.post("/get-multiple-gst-details", async (req, res) => {
  const gstNumbers = req.body.gstNumbers;

  if (!Array.isArray(gstNumbers) || gstNumbers.length === 0) {
    return res.status(400).json({ error: "GST numbers array is required." });
  }

  try {
    const results = await getMultipleGstDetails(gstNumbers);
    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Error in bulk GST fetch:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
