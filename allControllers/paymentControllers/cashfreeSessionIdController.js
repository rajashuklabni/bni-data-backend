const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const db = require('../../database/db');
const { Cashfree } = require('cashfree-pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();
const { Cashfree: CashfreeWebhook } = require('./cashfreeSignature');
require('dotenv').config();

// Define the transporter for nodemailer
const transporter = nodemailer.createTransport({
  host: "bninewdelhi.in",
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

const headers = {
    'x-client-id': process.env.x_client_id,
    'x-client-secret': process.env.x_client_secret,
    'x-api-version': process.env.x_api_version,
};

app.use(bodyParser.raw({ type: 'application/json' }));

let responseData1;
// Generate Cashfree sessionId and store order details in Orders table
const sessionIdGenerator = async (req, res) => {
    const data = req.body;
    console.log(data, "================body=================");
    responseData1 = {
        ...data,
        chapter_id: data.customer_details?.chapter_id,
        member_id: data.customer_details?.member_id,
        kitty_bill_id: data.kitty_bill_id,
        member_pending_balance: data.member_pending_balance,
        total_amount_paid: data.total_amount_paid,
        tax: data.tax,
        date_of_update: data.date_of_update
    };
    console.log(responseData1.tax, "============responseData1============");
    console.log(responseData1.order_amount, "============responseData1============");

    try {
      console.log("here2-----------------");

        const axiosResponse = await axios.post(`${process.env.cashfree_testing_url}/pg/orders`, data, { headers });
        const responseData = axiosResponse.data;
        console.log("here-----------------");

        // console.log(responseData, "=============session controller data");

        // Insert order details into Orders table
        const insertOrderData = async () => {
          try {
              // console.log(data.customer_details, "================== Customer Details =================="); // Log customer details
              console.log("data", data);

              // return;
      
              let orderValues = [];

              if(data.customer_details.payment_note === 'visitor-payment' || data.customer_details.payment_note === 'Visitor-payment-fee'){
                orderValues = [
                  responseData.order_id,
                  responseData.order_amount,
                  responseData.order_currency,
                  data.customer_details.payment_gateway_id ? parseInt(data.customer_details.payment_gateway_id) : null, // Ensure this is available
                  data.customer_details.member_id || null, // Use member_id from customer_details
                  data.customer_details.chapter_id || null, // Use chapter_id from customer_details
                  data.customer_details.region_id || null, // Use region_id from customer_details
                  data.customer_details.universal_link_id ? parseInt(data.customer_details.universal_link_id) : null,
                  data.customer_details.ulid_id || null, // Ensure this is available
                  responseData.order_status,
                  responseData.payment_session_id,
                  data.customer_details.one_time_registration_fee || 0, // New field
                  data.customer_details.membership_fee || 0, // New field
                  data.tax || 0, // New fiel
                  data.customer_details.memberName || "Unknown", // New field
                  data.customer_details.customer_email || "unknown@example.com", // New field
                  data.customer_details.customer_phone || "0000000000", // New field
                  (data.memberData?.member_gst_number || null), // New field
                  data.memberData?.member_company_name || "Unknown", // New field
                  data.customer_details?.mobileNumber || 1212121212, // New field
                  data.customer_details.renewalYear || null, // New field
                  data.customer_details.payment_note || null, // New field
                  data.customer_details.trainingId || null, // New field
                  data.customer_details.eventId || null, // New field
                  data.kitty_bill_id || null,
                  data.visitor_name.visitorName|| null,
                  data.visitor_name.email|| null,
                  data.visitor_name.mobileNumber|| 7418529635,
                  data.visitor_name.address|| null,
                  data.visitor_name.company|| null,
                  data.visitor_name.gstin|| null,
                  data.visitor_name.business|| null,
                  data.visitor_name.company_address || null,
                  data.visitor_name.visitor_state || null,
                  data.visitor_name.visitor_pincode || null,
                  new Date(),
                  new Date()


              ];
              await db.query(
                `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id,visitor_name,visitor_email,visitor_mobilenumber,visitor_address,visitor_company,visitor_gstin,visitor_business,visitor_company_address,visitor_state,visitor_pincode,created_at,updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)`,
                orderValues
            );
            }
            else if(data.customer_details.payment_note === 'New Member Payment'){
              console.log("data.customer_detial visited_id",data?.memberData?.visitor_id ||0 );
              orderValues = [
                responseData.order_id,
                responseData.order_amount,
                responseData.order_currency,
                data.customer_details.payment_gateway_id || null, // Ensure this is available
                data.customer_details.member_id || null, // Use member_id from customer_details
                data.customer_details.chapter_id || null, // Use chapter_id from customer_details
                data.customer_details.region_id || null, // Use region_id from customer_details
                data.customer_details.universal_link_id || null, // Ensure this is available
                data.customer_details.ulid_id || null, // Ensure this is available
                responseData.order_status,
                responseData.payment_session_id,
                data.customer_details.one_time_registration_fee || 0, // New field
                data.customer_details.membership_fee || 0, // New field
                data.tax || 0, // New field
                data?.memberData?.invited_by_name || "Unknown", // New field  old -data.customer_details.memberName
                data.customer_details.customer_email || "unknown@example.com", // New field
                data.customer_details.customer_phone || "0000000000", // New field
                (data.memberData?.member_gst_number || null), // New field
                data.memberData?.member_company_name || "Unknown", // New field
                data.customer_details?.mobileNumber || 1212121212, // New field
                data.customer_details.renewalYear || null, // New field
                data.customer_details.payment_note || null, // New field
                data.customer_details.trainingId || null, // New field
                data.customer_details.eventId || null, // New field
                data.kitty_bill_id || null,
                data?.memberData?.visitor_id || null,
                data.memberData?.visitor_name || data.visitor_name?.memberName, //old -data.visitor_name.visitorName 
                data.visitor_name.email|| null,
                data.visitor_name.mobileNumber|| null,
                data.visitor_name.address|| null,
                data.visitor_name.company|| null,
                data.visitor_name.gstin|| null,
                data.visitor_name.business|| null,
                data.visitor_name.company_address || null,
                new Date(),
                new Date()


            ];
            await db.query(
              `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id,visitor_id,visitor_name,visitor_email,visitor_mobilenumber,visitor_address,visitor_company,visitor_gstin,visitor_business,visitor_company_address,created_at,updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
              orderValues
          );
          }
          else {
            orderValues = [
              responseData.order_id,
              responseData.order_amount,
              responseData.order_currency,
              data.customer_details.payment_gateway_id ? parseInt(data.customer_details.payment_gateway_id) : 1, // Default to 1 if not available
              data.customer_details.member_id || null, // Use member_id from customer_details
              data.customer_details.chapter_id || null, // Use chapter_id from customer_details
              data.customer_details.region_id || null, // Use region_id from customer_details
              data.customer_details.universal_link_id ? parseInt(data.customer_details.universal_link_id) : null, // Just parse to integer if available
              data.customer_details.ulid_id || null, // Ensure this is available
              responseData.order_status,
              responseData.payment_session_id,
              data.customer_details.one_time_registration_fee || 0, // New field
              data.customer_details.membership_fee || 0, // New field
              data.tax || 0, // New field
              data.customer_details.memberName || "Unknown", // New field
              data.customer_details.customer_email || "unknown@example.com", // New field
              data.customer_details.customer_phone || "0000000000", // New field
              data.customer_details.gstin || null, // New field
              data.customer_details.company || "Unknown", // New field
              data.customer_details.mobileNumber || "0000000000", // New field
              data.customer_details.renewalYear || null, // New field
              data.customer_details.payment_note || null, // New field
              data.customer_details.trainingId || null, // New field
              data.customer_details.eventId || null, // New field
              data.kitty_bill_id || null,
              new Date(),
              new Date()

          ];

             await db.query(
    `INSERT INTO Orders (
      order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
    )`,
    orderValues
  );
          }

              // await db.query(
              //     `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id)
              //      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
              //     orderValues
              // );
              console.log('Order data inserted successfully',orderValues);
              // console.log(data.tax, "============tax============");
              // Start QR code process for training payments


              




              if (data.customer_details.universal_link_id === '3' && data.customer_details.trainingId) {
                console.log('🎓 Training payment detected');
                
                try {
                    // Get transaction details with a delay to allow transaction to be recorded
                    setTimeout(async () => {
                        try {
                            console.log('🔍 Checking transaction status for order:', responseData.order_id);
                            const transactionResponse = await axios.get('https://backend.bninewdelhi.com/api/allTransactions');
                            const transactions = transactionResponse.data;
                            
                            const relevantTransaction = transactions.find(t => t.order_id === responseData.order_id);
                            console.log('📊 Found transaction:', relevantTransaction);
                            
                            if (relevantTransaction && relevantTransaction.payment_status === 'SUCCESS') {
                                console.log('💰 Found successful transaction:', relevantTransaction.cf_payment_id);
                                
                                // Get training details
                                const trainingResponse = await axios.get('https://backend.bninewdelhi.com/api/allTrainings');
                                const trainings = trainingResponse.data;
                                
                                const training = trainings.find(t => t.training_id === data.customer_details.trainingId);
                                
                                if (training) {
                                    console.log('📚 Found training details:', training);
                                    
                                    // Prepare data for QR code email
                                    const qrCodeData = {
                                        orderId: responseData.order_id,
                                        cfPaymentId: relevantTransaction.cf_payment_id,
                                        page_title: 'BNI Training Registration',
                                        training_name: training.training_name,
                                        training_venue: training.training_venue,
                                        training_ticket_price: training.training_price,
                                        training_date: training.training_date,
                                        training_published_by: training.training_published_by,
                                        training_id: training.training_id,
                                        customerId: data.customer_details.member_id
                                    };
                                    
                                    console.log('📧 Preparing to send QR code email with data:', qrCodeData);
                                    
                                    // Send QR code email
                                    try {
                                        await axios.post('https://backend.bninewdelhi.com/api/send-qr-code', qrCodeData);
                                        console.log('✉️ QR code email sent successfully');
                                    } catch (emailError) {
                                        console.error('❌ Error sending QR code email:', emailError);
                                        console.error('Error details:', emailError.response?.data || emailError.message);
                                    }
                                } else {
                                    console.log('⚠️ Training not found for ID:', data.customer_details.trainingId);
                                }
                            } else {
                                console.log('⏳ Payment not yet successful or transaction not found for order:', responseData.order_id);
                            }
                        } catch (error) {
                            console.error('❌ Error checking transaction status:', error);
                        }
                    }, 30000); // Wait 5 seconds before checking transaction status
                    
                } catch (error) {
                    console.error('❌ Error in QR code process:', error);
                }
            } else {
                console.log('📝 Not a training payment, skipping QR code process');
            }
          } catch (error) {
              console.error('Error inserting order data:', error);
          }
      };
      
        // Execute insertions
        await insertOrderData();
        res.json(responseData);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Something went wrong, try again!' });
    }
};

const getOrderStatus = async (req, res) => {
  const { order_id } = req.params;

  console.log("Order ID:", order_id);

  try {
    // Check if the order_id exists in the Orders table
    const orderCheck = await db.query('SELECT * FROM Orders WHERE order_id = $1', [order_id]);
    if (orderCheck.rowCount === 0) {
      console.error("Order ID does not exist in Orders table");
      return res.status(400).json({ error: "Order ID does not exist in Orders table" });
    }


    // Get the order details to access customer_details
    const orderDetails = await db.query(
      'SELECT * FROM Orders WHERE order_id = $1',
      [order_id]
    );
    const orderData = orderDetails.rows[0];

    // Fetch order data from Cashfree API
    const getOrderData = await axios.get(
      `${process.env.cashfree_testing_url}/pg/orders/${order_id}/payments`,
      { headers }
    );

    console.log(getOrderData.data);
    
    if (!Array.isArray(getOrderData.data) || getOrderData.data.length === 0) {
      console.error("No payment details found for the order");
      return res.status(404).json({ error: "No payment details found for the order" });
    }

    const paymentDetails = getOrderData.data[0];
    const existingTransaction = await db.query(
      `SELECT * FROM Transactions WHERE cf_payment_id = $1`,
      [getOrderData.data[0].cf_payment_id]
    );

    if (existingTransaction.rowCount > 0) {
      console.log("Transaction already exists for the order");
      return res.redirect(`${process.env.baseUrl}/payment-status/${order_id}`);
    }

    console.log("paymentDetails==============================",paymentDetails);
    if (paymentDetails) {
      const {
        cf_payment_id,
        payment_amount,
        payment_currency,
        payment_status,
        payment_time,
        payment_completion_time,
        bank_reference,
        auth_id,
        payment_group,
        payment_message = null,
        error_details = null,
        payment_gateway_details: { gateway_order_id, gateway_payment_id },
        payment_method,
      } = paymentDetails;

      await db.query(
        `INSERT INTO Transactions 
          (cf_payment_id, order_id, payment_gateway_id, payment_amount, payment_currency, payment_status, 
           payment_message, payment_time, payment_completion_time, bank_reference, auth_id, payment_method, 
           error_details, gateway_order_id, gateway_payment_id, payment_group, is_settled, settlement_id, utr, settled_on, einvoice_generated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          cf_payment_id,
          order_id,
          1, // Assume 1 for Cashfree
          payment_amount,
          payment_currency,
          payment_status,
          payment_message,
          payment_time,
          payment_completion_time,
          bank_reference,
          auth_id,
          JSON.stringify(payment_method),
          JSON.stringify(error_details),
          gateway_order_id,
          gateway_payment_id,
          payment_group,
          false,
          null,
          null,
          null,
          false
        ]
      );

      console.log('Transaction data inserted successfully');

      // here added by vasu
      const balance_data = {
        chapter_id: orderData.chapter_id ?? responseData1.chapter_id,
        member_id: responseData1.member_id,
        kitty_bill_id: responseData1.kitty_bill_id,
        member_pending_balance: responseData1.member_pending_balance,
        total_amount_paid:responseData1.total_amount_paid,
        tax: responseData1.tax,
        date_of_update:responseData1.date_of_update,

      }
      // console.log("separated data");
      // console.log(balance_data);

      if(payment_status==='SUCCESS' && (responseData1.customer_details.payment_note === 'meeting-payments' || responseData1.customer_details.payment_note === 'meeting-payments-opening-only')){
        try {
            console.log("Starting bankorder update process for member:", balance_data.member_id);
            
            // Validate required data
            if (!balance_data.member_id || !balance_data.chapter_id) {
                throw new Error('Missing required member_id or chapter_id');
            }
    
            // Get member credits with retry mechanism
            let creditData;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    const creditResponse = await fetch("https://backend.bninewdelhi.com/api/getAllMemberCredit");
                    if (!creditResponse.ok) {
                        throw new Error(`Credit API responded with status: ${creditResponse.status}`);
                    }
                    creditData = await creditResponse.json();
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount === maxRetries) {
                        throw new Error(`Failed to fetch credit data after ${maxRetries} attempts: ${error.message}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
    
            // Filter and update credits with transaction
            // const client = await db.connect();
            try {
                await db.query('BEGIN');
    
                const filteredCredits = creditData.filter(credit => 
                    credit.member_id === balance_data.member_id && 
                    credit.chapter_id === balance_data.chapter_id && 
                    credit.is_adjusted === false
                );
    
                console.log(`Found ${filteredCredits.length} credits to update for member:`, balance_data.member_id);
    
                for (const credit of filteredCredits) {
                    const updateResult = await db.query(`
                        UPDATE memberkittycredit 
                        SET is_adjusted = true 
                        WHERE credit_id = $1
                        RETURNING credit_id`, [credit.credit_id]
                    );
                    
                    if (updateResult.rowCount === 0) {
                        throw new Error(`Failed to update credit_id: ${credit.credit_id}`);
                    }
                }
    
                // Validate payment data
                const amountPaid = parseFloat(payment_amount);
                if (isNaN(amountPaid) || amountPaid <= 0) {
                    throw new Error(`Invalid payment amount: ${payment_amount}`);
                }
    
                // Get bankorder with row locking
                const bankOrderResult = await db.query(
                    'SELECT * FROM bankorder WHERE member_id = $1 FOR UPDATE',
                    [balance_data.member_id]
                );
    
                const bankOrder = bankOrderResult.rows[0];
                if (!bankOrder) {
                    throw new Error(`No bankOrder found for member_id: ${balance_data.member_id}`);
                }

                console.log("Penalty Amount Details:", {
                    value: responseData1.penalty_amount,
                    type: typeof responseData1.penalty_amount,
                    isNumber: !isNaN(responseData1.penalty_amount),
                    raw: responseData1.penalty_amount
                });

                // Handle penalty case
                
                    console.log("Processing penalty case for member:", balance_data.member_id);
                    
                    const baseDue = parseFloat(bankOrder.amount_to_pay);
                    const penaltyAmount = parseFloat(responseData1.penalty_amount) || 0; // Get penalty from response data
                   const totalWithPenalty = baseDue + penaltyAmount;
                   let actualPenaltyPaid = 0; 
                    
                    if (isNaN(baseDue) || baseDue < 0) {
                        throw new Error(`Invalid base due amount: ${bankOrder.amount_to_pay}`);
                    }
    
                    const expectedPaymentWithoutPenalty = baseDue * 1.18;
                    const expectedPaymentWithPenalty = totalWithPenalty * 1.18;
                    const margin = 2;
    
                    let basePaid;
                    let amount_to_pay
                    if (Math.abs(amountPaid - expectedPaymentWithPenalty) < margin) {
                      // User paid full amount including penalty
                      basePaid = totalWithPenalty;
                      actualPenaltyPaid = penaltyAmount;
                      amount_to_pay = 0;
                      console.log("Full payment with penalty detected, base amount:", basePaid);
                    }
                    else if (Math.abs(amountPaid - expectedPaymentWithoutPenalty) < margin) {
                      // User paid full amount without penalty
                      basePaid = baseDue;
                      actualPenaltyPaid = 0;
                      amount_to_pay = 0;
                      console.log("Full payment without penalty detected, base amount:", basePaid);
                  } else {
                        basePaid = Math.round(amountPaid / 1.18);
                        amount_to_pay = baseDue - basePaid;
                        console.log("Partial payment detected, calculated base:", basePaid);
                    }
    
                    // Validate penalty data
                    if (isNaN(responseData1.no_of_late_payment) || isNaN(responseData1.penalty_amount)) {
                        throw new Error('Invalid penalty data');
                    }
    
                    // Update bankorder with validation
                    const updateResult = await db.query(`
                        UPDATE bankorder 
                        SET amount_to_pay = $1,
                            no_of_late_payment = $2,
                            kitty_penalty = $3
                        WHERE member_id = $4
                        RETURNING *`,
                        [amount_to_pay, responseData1.no_of_late_payment, responseData1.penalty_amount, balance_data.member_id]
                    );
    
                    if (updateResult.rowCount === 0) {
                        throw new Error('Bankorder update failed');
                    }
    
                    // Verify the update
                    const updatedBankOrder = updateResult.rows[0];
                    console.log("Bankorder updated successfully:", {
                        member_id: balance_data.member_id,
                        new_amount: updatedBankOrder.amount_to_pay,
                        penalty: updatedBankOrder.kitty_penalty
                    });
                
    
                await db.query('COMMIT');
                console.log("Transaction completed successfully for member:", balance_data.member_id);
    
            } catch (error) {
                await db.query('ROLLBACK');
                throw error;
            } finally {
                db.release();
            }
    
        } catch (error) {
            console.error("Error in bankorder update process:", {
                error: error.message,
                member_id: balance_data.member_id,
                payment_amount: payment_amount,
                stack: error.stack
            });
            
            // Log to monitoring system if available
            // await logToMonitoringSystem({
            //     type: 'BANKORDER_UPDATE_ERROR',
            //     member_id: balance_data.member_id,
            //     error: error.message
            // });
    
            throw error; // Re-throw to be handled by the calling function
        }
    }


        const getvisitorData = await axios.get(
          "https://backend.bninewdelhi.com/api/getAllVisitors"
        );
        // console.log("---",getvisitorData.data);
        const matchedVisitor = getvisitorData.data.find(visitor => 
          responseData1.visitor_name?.mobileNumber && visitor.visitor_phone === responseData1.visitor_name.mobileNumber
        );

        if (matchedVisitor) {
          console.log("Matched visitor:", matchedVisitor);
          console.log("Matched visitor:", matchedVisitor.visitor_phone);

        } else {
          console.log("No match found.");
        }


        if(payment_status==='SUCCESS' && (responseData1.customer_details.payment_note === 'visitor-payment' || responseData1.customer_details.payment_note === 'Visitor-payment-fee')){

          console.log("It's a visitor payment");           
          
          if (matchedVisitor) {
            console.log("Matched visitor logic 2 implement");
            
            const subtotal = parseInt(parseInt(responseData1.order_amount) - parseInt(responseData1.tax));
            
            const query = `
              UPDATE Visitors 
              SET visitor_form = $1,
                  total_amount = $2,
                  sub_total = $3,
                  tax = $4,
                  order_id = $5
              WHERE visitor_id = $6
            `;
            
            const values = [
              true,                           // visitor_form
              responseData1.order_amount,     // total_amount
              subtotal,                       // sub_total
              responseData1.tax,              // tax
              order_id,                       // order_id
              matchedVisitor.visitor_id       // visitor_id
            ];
          
            await db.query(query, values)
              .then(res => console.log("Update successful"))
              .catch(err => console.error("Error updating visitor:", err));
            console.log('Visitor data updated successfully');
          }
 else {
            console.log("No match found.");
            const subtotal= parseInt(parseInt(responseData1.order_amount)-parseInt(responseData1.tax));
        const visitorValues = {
          region_id: responseData1.customer_details.region_id || null,
          chapter_id: responseData1.customer_details.chapter_id || null,
          invited_by: responseData1?.memberData?.member_id || null,
          invited_by_name: responseData1.customer_details?.memberName || "Unknown",
          visitor_company_address: responseData1?.visitor_name?.company_address || null,
          visitor_name: responseData1.visitor_name.visitorName|| null,
          visitor_email: responseData1.visitor_name.email|| null,
          visitor_phone:responseData1.visitor_name.mobileNumber|| 7418529935,
          visitor_company_name: responseData1.visitor_name.company|| null,
          visitor_address: responseData1.visitor_name.address|| null,
          visitor_gst: responseData1.visitor_name.gstin|| null,
          visitor_business: responseData1.visitor_name.business|| null,
          visitor_category: responseData1.visitor_name.business|| null,
          visited_date: responseData1.visitor_name.date || null ,
          total_amount: responseData1.order_amount,
          sub_total: subtotal,
          tax: responseData1.tax,
          delete_status: false,
          active_status: "active",
          order_id: order_id,
          visitor_form: true
        };

        await db.query(
          `INSERT INTO Visitors (region_id, chapter_id, invited_by, invited_by_name, visitor_company_address, visitor_name, visitor_email, visitor_phone, visitor_company_name, visitor_address, visitor_gst, visitor_business, visitor_category, visited_date, total_amount, sub_total, tax, delete_status, active_status,order_id,visitor_form)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          Object.values(visitorValues)
        );
        console.log('Visitor data inserted successfully', visitorValues);
          }
                   
          

        }
        else{
          console.log("not a visitor payment");

        }
        if(payment_status==='SUCCESS' && (responseData1.customer_details.payment_note === 'New Member Payment')){

          console.log("It's a NEw member payment");           
          
            
          if (matchedVisitor) {
            console.log("Matched visitor:", matchedVisitor);
            console.log("Matched visitor:", matchedVisitor.visitor_id);
            const query = 'UPDATE Visitors SET new_member_form = $1 WHERE visitor_id = $2';
            const values = [true, matchedVisitor.visitor_id];

             await db.query(query, values)
              .then(res => console.log("Update successful"))
              .catch(err => console.error("Error updating visitor:", err));
              console.log('Visitor data updated successfully', );

          // Get membership pending details from API
          try {
            const membershipResponse = await axios.get(`https://backend.bninewdelhi.com/api/getMembershipPending`);
            const membershipData = membershipResponse.data;

            // Check if visitor_id exists in API response
            const existingMembership = membershipData.find(item => item.visitor_id === matchedVisitor.visitor_id);

            if (existingMembership) {
              // Update existing membership record
              console.log("found previous data:",existingMembership);

              const previousPay = parseFloat(existingMembership.paid_amount);
              
              // incoming - gst
              const payingGst = (parseFloat(responseData1.order_amount)*18)/118 ;
              const payingAmountWithoutGST = parseFloat(responseData1.order_amount) - payingGst;
              const currpaid = previousPay + payingAmountWithoutGST;
              const pending = parseFloat(existingMembership.due_balance) - parseFloat(payingAmountWithoutGST);
          
              const updateQuery = `
                UPDATE new_member_membership 
                SET paid_amount = $1, 
                    order_id = $2,
                    due_balance = $3
                WHERE visitor_id = $4
              `;
              const updateValues = [
                currpaid,
                order_id,
                pending, // previous subtract incoming
                matchedVisitor.visitor_id
              ];

              await db.query(updateQuery, updateValues);
              console.log('Membership pending record updated successfully');

            } else {
              // Insert new membership record
              const insertQuery = `
                INSERT INTO new_member_membership (
                  visitor_id, total_amount, paid_amount, membership_yr,
                  date_of_purchase, order_id, due_balance
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
              `;
              // Calculate total amount as tax + subtotal
              const totalAmount = parseFloat(responseData1.customer_details.sub_total);
              // incoming - gst
              const payingGst = (parseFloat(responseData1.order_amount)*18)/118 ;
              const payingAmountWithoutGST = parseFloat(responseData1.order_amount) - payingGst;
              const pending = parseFloat(totalAmount) - parseFloat(payingAmountWithoutGST);
              const myear = responseData1.customer_details.renewalYear === "1Year" ? 1 : responseData1.customer_details.renewalYear === "2Year" ? 2 : null;

              const insertValues = [
                matchedVisitor.visitor_id,
                totalAmount,
                payingAmountWithoutGST,
                myear, // membership_yr
                responseData1.customer_details.date, // current date
                order_id,
                pending
              ];

              await db.query(insertQuery, insertValues);
              console.log('New membership pending record inserted successfully');
            }

          } catch (error) {
            console.error('Error handling membership pending data:', error);
          }
  
          } else {
            console.log("No match found.");
            const subtotal= parseInt(parseInt(responseData1.order_amount)-parseInt(responseData1.tax));
        const visitorValues = {
          region_id: responseData1.customer_details.region_id || null,
          chapter_id: responseData1.customer_details.chapter_id || null,
          invited_by: responseData1.memberData?.member_id || null,
          invited_by_name: responseData1.customer_details?.memberName || "Unknown",
          visitor_name: responseData1.visitor_name.memberName|| null,
          visitor_email: responseData1.visitor_name.email|| null,
          visitor_phone:responseData1.visitor_name.mobileNumber|| 7418529635,
          visitor_company_name: responseData1.visitor_name.company|| null,
          visitor_company_address: responseData1?.visitor_name?.company_address || null,
          visitor_address: responseData1.visitor_name.address|| null,
          visitor_gst: responseData1.visitor_name.gstin|| null,
          visitor_business: responseData1.visitor_name.business|| null,
          visitor_category: responseData1.visitor_name.business|| null,
          visited_date: responseData1.visitor_name.date || null ,
          total_amount: responseData1.order_amount,
          sub_total: subtotal || null,
          tax: responseData1.tax,
          delete_status: false,
          active_status: "active",
          order_id: order_id,
          new_member_form : true
        };

        const result = await db.query(
          `INSERT INTO Visitors (region_id, chapter_id, invited_by, invited_by_name, visitor_name, visitor_email, visitor_phone, visitor_company_name, visitor_company_address, visitor_address, visitor_gst, visitor_business, visitor_category, visited_date, total_amount, sub_total, tax, delete_status, active_status,order_id,new_member_form)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING visitor_id`,
          Object.values(visitorValues)
        );
        console.log("Newly inserted visitor ID:", result.rows[0].visitor_id);
        console.log('New member data added in Visitor db inserted successfully', visitorValues);

        // Insert new membership record
        const insertQuery = `
        INSERT INTO new_member_membership (
          visitor_id, total_amount, paid_amount, membership_yr,
          date_of_purchase, order_id, due_balance
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      // Calculate total amount as tax + subtotal
      const totalAmount = parseFloat(responseData1.customer_details.sub_total);
      // incoming - gst
      const payingGst = (parseFloat(responseData1.order_amount)*18)/118 ;
      const payingAmountWithoutGST = parseFloat(responseData1.order_amount) - payingGst;
      const pending = parseFloat(totalAmount) - parseFloat(payingAmountWithoutGST);
      const myear = responseData1.customer_details.renewalYear === "1Year" ? 1 : responseData1.customer_details.renewalYear === "2Year" ? 2 : null;
      const insertValues = [
        result.rows[0].visitor_id,
        totalAmount,
        payingAmountWithoutGST,
        myear, // membership_yr
        responseData1.customer_details.date, // current date
        order_id,
        pending
      ];

      await db.query(insertQuery, insertValues);
      console.log('New membership pending record inserted successfully');
          }
            
            
            
                   
          

        }
        else{
          console.log("not a new member payment");

        }
        

      return res.redirect(`${process.env.baseUrl}/payment-status/${order_id}`);
    } else {
      console.error("Payment details missing");
      return res.redirect(`${process.env.baseUrl}/payment-status/${order_id}`);
    }
  } catch (error) {
    console.error('Error in getOrderStatus:', error);
    return res.redirect(`${process.env.baseUrl}/payment-status/${order_id}`);
  }
};

const getPaymentStatus=async(req,res)=>{
    const { order_id } = req.params;
    console.log("getting payment status from payment page")
    console.log(order_id)
    try {
      const getOrderData = await axios.get(
        `${process.env.cashfree_testing_url}/pg/orders/${order_id}/payments`,
        { headers }
      );
        res.json(getOrderData.data);
      } 
    catch (error) {
      console.error("Error fetching order data:", error.message);
      res.status(500).json({ error: "Error fetching order data" });
    }
}

const getSettlementStatus = async (req, res) => {
  const { order_id } = req.params;

  try {
      // Fetch settlement status from Cashfree API
      const settlementResponse = await axios.get(
          `${process.env.cashfree_testing_url}/pg/orders/${order_id}/settlements`,
          { headers }
      );

      const settlementData = settlementResponse.data;
      // console.log(settlementData);

      // Extract settlement details
      const {
          cf_payment_id,
          cf_settlement_id,
          entity,
          order_amount,
          order_currency,
          order_id: fetched_order_id,
          payment_time,
          service_charge,
          service_tax,
          settlement_amount,
          settlement_currency,
          transfer_id,
          transfer_time,
          transfer_utr
      } = settlementData;

      // Insert data into settlementstatus table
      await db.query(
        `INSERT INTO settlementstatus (
            cf_payment_id, 
            cf_settlement_id, 
            entity, 
            order_amount, 
            order_currency, 
            order_id, 
            payment_time, 
            service_charge, 
            service_tax, 
            settlement_amount, 
            settlement_currency, 
            transfer_id, 
            transfer_time, 
            transfer_utr
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (cf_settlement_id) DO NOTHING`, // Avoid duplicate entries
        [
            cf_payment_id,
            cf_settlement_id,
            entity,
            order_amount,
            order_currency,
            fetched_order_id,
            payment_time,
            service_charge,
            service_tax,
            settlement_amount,
            settlement_currency,
            transfer_id,
            transfer_time,
            transfer_utr
        ]
    );
    

      // console.log('Settlement data inserted successfully');
      res.status(200).json({ message: 'Settlement data stored successfully', settlementData });

  } catch (error) {
      // console.error('Error fetching settlement status:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Failed to fetch settlement status' });
  }
};

// Fetch settlement data by cf_settlement_id
const getSettlementByCfPaymentId = async (req, res) => {
  const { cf_payment_id } = req.params;

  try {
      // Query the database for the settlement record
      const result = await db.query(
          `SELECT * FROM settlementstatus WHERE cf_payment_id = $1`,
          [cf_payment_id]
      );

      if (result.rows.length === 0) {
          return res.status(404).json({ error: `No settlement found with cf_settlement_id: ${cf_payment_id}` });
      }

      res.status(200).json({ settlement: result.rows[0] });
  } catch (error) {
      console.error('Error fetching settlement data:', error.message);
      res.status(500).json({ error: 'Failed to fetch settlement data' });
  }
};

// Fetch settlement data by cf_settlement_id
const getOrderByTrainingId = async (req, res) => {
  const { training_id } = req.params;

  try {
    // Query the database for the settlement record
    const result = await db.query(
      `SELECT * FROM orders WHERE training_id = $1`,
      [training_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No orders found with training id: ${training_id}` });
    }

    res.status(200).json(result.rows);  // Add this line to send the data back

  } catch (error) {
    console.error('Error fetching order training data:', error.message);
    res.status(500).json({ error: 'Failed to fetch order training data' });
  }
};

const webhookSettlementStatus = async (req, res) => {
  console.log('=== Webhook Handler Debug ===');
  console.log('Headers:', req.headers);
  
  // Get the raw body as a string
  const rawBody = req.body.toString('utf8');
  console.log('Raw body:', rawBody);
  
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('Failed to parse webhook body:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
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

    // Verify the webhook signature using the raw body
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
    sessionIdGenerator,
    getOrderStatus,
    getPaymentStatus,
    getSettlementStatus,
    getSettlementByCfPaymentId,
    getOrderByTrainingId,
    webhookSettlementStatus
};