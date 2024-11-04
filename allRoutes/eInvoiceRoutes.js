// allRoutes/elvoiceRoutes.js
const express = require("express");
const router = express.Router();
const { getAuthToken } = require("../allControllers/paymentControllers/elvoiceController");

// POST endpoint to generate an e-invoice
router.post("/generate-einvoice", getAuthToken);

module.exports = router;
