// allRoutes/elvoiceRoutes.js
const express = require("express");
const router = express.Router();
const { getToken } = require("../allControllers/paymentControllers/elvoiceController");

// POST endpoint to generate an e-invoice
router.post("/get-token", getToken);

module.exports = router;
