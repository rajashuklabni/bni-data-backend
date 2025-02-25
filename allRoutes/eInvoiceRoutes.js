// allRoutes/elvoiceRoutes.js
const express = require("express");
const router = express.Router();
const { getToken, generateIRN } = require("../allControllers/paymentControllers/elvoiceController");

// POST endpoint to generate an e-invoice
router.post("/get-token", getToken);
router.post('/generate-irn', async (req, res) => {
    await generateIRN(req, res);
  });
module.exports = router;
