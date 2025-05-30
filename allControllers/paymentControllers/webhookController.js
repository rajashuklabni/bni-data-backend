const express = require('express');
const db = require('../../database/db');
const { Cashfree } = require('cashfree-pg');
const nodemailer = require('nodemailer');
const app = express();
const { Cashfree: CashfreeWebhook } = require('./cashfreeSignature');
require('dotenv').config();

// Define the transporter for nodemailer
const transporter = nodemailer.createTransport({
  host: "server.bninewdelhi.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@bninewdelhi.in",
    pass: "PzfE8JH93pV1RUx",
  },
});

// Set up Cashfree SDK with environment variables
Cashfree.XClientId = process.env.x_client_id;
Cashfree.XClientSecret = process.env.x_client_secret;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION; // Use production for testing



const webhookSettlementStatus = async (req, res) => {
    console.log('=== Webhook Handler Debug ===');
    console.log('Headers:', req.headers);
    
    let rawBody;
    let payload;

    // 1. Get the raw body as string if it's a Buffer
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
      console.log('Raw body from buffer:', rawBody);
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        console.error('Error processing webhook body:', e);
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    } else if (typeof req.body === 'string') {
      // If for some reason it's a string
      rawBody = req.body;
      console.log('Raw body from string:', rawBody);
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        console.error('Error processing webhook body:', e);
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    } else if (typeof req.body === 'object') {
      // Already parsed
      payload = req.body;
      rawBody = JSON.stringify(req.body);
      console.log('Raw body from object:', rawBody);
    } else {
      // Unknown type
      console.error('Unknown body type:', typeof req.body);
      return res.status(400).json({ error: 'Invalid body type' });
    }
  
    // Log the parsed payload
    console.log('Parsed webhook payload:', payload);
  
    // Handle Cashfree test payload
    if (!payload || !payload.data || !payload.data.settlement) {
      if (payload && payload.data && payload.data.test_object) {
        console.log('Received Cashfree test webhook payload');
        return res.status(200).json({ message: 'Test webhook received' });
      }
      console.error('Invalid webhook payload structure');
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
  
    // --- Business Logic for Real Settlement Webhook ---
    try {
      // Get signature and timestamp from headers
      const signature = req.headers['x-webhook-signature'];
      const timestamp = req.headers['x-webhook-timestamp'];
  
      console.log('Webhook signature:', signature);
      console.log('Webhook timestamp:', timestamp);
  
      // Set the client secret for signature verification
      if (!process.env.x_client_secret) {
        console.error('Missing x_client_secret in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      CashfreeWebhook.XClientSecret = process.env.x_client_secret;
  
      // Verify the webhook signature
      const webhookEvent = CashfreeWebhook.PGVerifyWebhookSignature(signature, rawBody, timestamp);
      console.log('Webhook signature verified successfully');
      console.log('Webhook data:', webhookEvent.object);
  
      // --- Reconciliation Logic ---
      const settlement = webhookEvent.object.data.settlement;
      const settlement_id = settlement.settlement_id;
      const payment_from = settlement.payment_from;
      const payment_till = settlement.payment_till;
      const utr = settlement.utr;
      const settled_on = settlement.settled_on;
  
      try {
        const updateQuery = `
          UPDATE transactions
          SET is_settled = true, settlement_id = $1, utr = $2, settled_on = $3
          WHERE payment_status = 'SUCCESS'
            AND payment_completion_time >= $4
            AND payment_completion_time <= $5
            AND payment_group NOT IN ('cash', 'visitor_payment')
        `;
        const updateValues = [settlement_id, utr, settled_on, payment_from, payment_till];
        const result = await db.query(updateQuery, updateValues);
        console.log(`Reconciliation: ${result.rowCount} transactions marked as settled for settlement_id ${settlement_id}`);
      } catch (err) {
        console.error('Error during reconciliation:', err);
      }
  
      // Send email notification
      const mailOptions = {
        from: 'info@bninewdelhi.in',
        to: 'scriptforprince@gmail.com',
        cc: 'rajashukla@outlook.com',
        subject: 'Cashfree Settlement Webhook Received',
        html: `
          <h2>Cashfree Settlement Webhook Received</h2>
          <p><strong>Event Type:</strong> ${webhookEvent.object.type}</p>
          <p><strong>Event Time:</strong> ${webhookEvent.object.event_time}</p>
          <p><strong>Settlement ID:</strong> ${webhookEvent.object.data.settlement.settlement_id}</p>
          <p><strong>Status:</strong> ${webhookEvent.object.data.settlement.status}</p>
          <p><strong>UTR:</strong> ${webhookEvent.object.data.settlement.utr}</p>
          <p><strong>Settlement Amount:</strong> ${webhookEvent.object.data.settlement.settlement_amount}</p>
          <p><strong>Settled On:</strong> ${webhookEvent.object.data.settlement.settled_on}</p>
        `
      };
  
      await transporter.sendMail(mailOptions);
      console.log('Settlement webhook notification email sent successfully');
  
      // Return success response
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Error processing real settlement webhook:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  };
  
  
  
  module.exports = {
      webhookSettlementStatus
  };