// allRoutes/elvoiceRoutes.js
const express = require("express");
const router = express.Router();
const {loginController} = require("../../allControllers/authControllers/authcontrollers");

// POST endpoint to generate an e-invoice
router.post("/auth/login",loginController);

module.exports = router;