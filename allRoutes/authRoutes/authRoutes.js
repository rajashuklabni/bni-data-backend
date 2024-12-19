// allRoutes/elvoiceRoutes.js
const express = require("express");
const router = express.Router();
const {loginController, verifyOtpController} = require("../../allControllers/authControllers/authcontrollers");

// POST endpoint to generate an e-invoice
router.post("/auth/login",loginController);
router.post("/auth/verify-otp",verifyOtpController);

module.exports = router;