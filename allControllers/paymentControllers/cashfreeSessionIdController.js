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
                  parseInt(data.customer_details.customer_id) || null, // Use member_id from customer_details
                  data.customer_details.chapter_id || null, // Use chapter_id from customer_details
                  data.customer_details.region_id || null, // Use region_id from customer_details
                  data.customer_details.universal_link_id ? parseInt(data.customer_details.universal_link_id) : null,
                  data.customer_details.ulid_id || null, // Ensure this is available
                  responseData.order_status,
                  responseData.payment_session_id,
                  data.customer_details.one_time_registration_fee || 0, // New field
                  data.customer_details.membership_fee || 0, // New field
                  data.tax || 0, // New fiel
                  data.customer_details.memberName || data.customer_details.customer_name || "Unknown", // Use memberName first, then customer_name as fallback
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
              data.customer_details.memberName || data.customer_details.customer_name || "Unknown", // Use memberName first, then customer_name as fallback
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
              data.customer_details.accolade_id || null, // Add accolade_id for member-requisition-payment
              new Date(),
              new Date()

        ];

             await db.query(
    `INSERT INTO Orders (
      order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id, accolade_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
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
            console.log("Starting simplified bankorder update process for member:", balance_data.member_id);
            
            // Validate required data
            if (!balance_data.member_id) {
                throw new Error('Missing required member_id');
            }
    
            // Get member details from member table
            const memberResult = await db.query(
                'SELECT * FROM member WHERE member_id = $1',
                [balance_data.member_id]
            );
    
            if (memberResult.rowCount === 0) {
                throw new Error(`No member found for member_id: ${balance_data.member_id}`);
            }
    
            const member = memberResult.rows[0];
            console.log("Found member:", member.member_name);
    
            // Calculate base amount using correct GST formula: (amount/118)*100
            const receivedAmount = parseFloat(payment_amount);
            const baseAmount = (receivedAmount / 118) * 100;
            
            console.log("Received amount:", receivedAmount);
            console.log("Base amount (after GST deduction):", baseAmount);
    
            // Get current meeting payable amount
            const currentMeetingPayable = parseFloat(member.meeting_payable_amount) || 0;
            
              // Calculate new meeting payable amount and round it off
        const newMeetingPayable = Math.round(currentMeetingPayable - baseAmount);
            
            console.log("Current meeting payable:", currentMeetingPayable);
            console.log("New meeting payable:", newMeetingPayable);
    
            // Update member's meeting payable amount
            const updateResult = await db.query(`
                UPDATE member 
                SET meeting_payable_amount = $1
                WHERE member_id = $2
                RETURNING member_id, meeting_payable_amount`,
                [newMeetingPayable, balance_data.member_id]
            );
    
            if (updateResult.rowCount === 0) {
                throw new Error('Member update failed');
            }
    
            console.log("Member meeting payable amount updated successfully:", {
                member_id: balance_data.member_id,
                new_meeting_payable: updateResult.rows[0].meeting_payable_amount
            });
    
        } catch (error) {
            console.error("Error in simplified bankorder update process:", {
                error: error.message,
                member_id: balance_data.member_id,
                payment_amount: payment_amount,
                stack: error.stack
            });
            throw error; 
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
        

      // Check if this is an accolade payment and create member requisition
      if (responseData1.customer_details.payment_note === 'member-requisition-payment') {
        try {
          // Create member requisition for accolade payment
          const accoladeId = responseData1.customer_details.accolade_id;
          const memberId = responseData1.customer_details.member_id;
          const chapterId = responseData1.customer_details.chapter_id;
          const requestComment = responseData1.customer_details.request_comment || 'Payment completed via Cashfree';
          
          // Calculate base amount (total amount / 1.18 to remove tax)
          const totalAmount = parseFloat(responseData1.order_amount);
          const baseAmount = parseFloat((totalAmount / 1.18).toFixed(2));
          
          // Insert into member_requisition_request table
          await db.query(
            `INSERT INTO member_requisition_request 
             (member_id, chapter_id, accolade_id, request_comment, accolade_amount, approve_status, given_status, order_id, requested_time_date, action_need)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              memberId,
              chapterId,
              accoladeId,
              requestComment,
              baseAmount,
              'pending', // Default approve_status
              false, // Default given_status,
              order_id,
              new Date(),
              true
            ]
          );
          
          console.log('✅ Member requisition request created for accolade payment:', {
            memberId,
            chapterId,
            accoladeId,
            baseAmount,
            orderId: order_id
          });
        } catch (error) {
          console.error('❌ Error creating member requisition request:', error);
          // Continue with redirect even if requisition creation fails
        }
        
        return res.redirect(`http://localhost:3000/macc/memberAccoladePaymentReceipt?order_id=${order_id}`);
      } else {
        return res.redirect(`${process.env.baseUrl}/payment-status/${order_id}`);
      }
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
  
  try {
    // Get the raw body as a string for signature verification
    let rawBody;
    let payload;
    
    // Handle different body formats (raw vs parsed)
    if (typeof req.body === 'string') {
      rawBody = req.body;
      payload = JSON.parse(rawBody);
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
      payload = JSON.parse(rawBody);
    } else {
      // Body is already parsed object - reconstruct raw body for signature verification
      rawBody = JSON.stringify(req.body);
      payload = req.body;
    }
    
    console.log('Raw body:', rawBody);
    console.log('Parsed webhook payload:', payload);

    // Validate payload structure
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid webhook payload: not an object');
      return res.status(400).json({ error: 'Invalid webhook payload structure' });
    }

    // Handle Cashfree test payload
    if (payload.data && payload.data.test_object) {
      console.log('Received Cashfree test webhook payload');
      return res.status(200).json({ message: 'Test webhook received successfully' });
    }

    // Validate settlement payload structure
    if (!payload.data || !payload.data.settlement) {
      console.error('Invalid webhook payload: missing settlement data');
      return res.status(400).json({ error: 'Invalid settlement webhook payload' });
    }

    // Get and validate required headers
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      console.error('Missing required webhook headers');
      return res.status(400).json({ error: 'Missing webhook signature or timestamp' });
    }

    console.log('Webhook signature:', signature);
    console.log('Webhook timestamp:', timestamp);

    // Validate environment configuration
    if (!process.env.x_client_secret) {
      console.error('Missing x_client_secret in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Set the client secret for signature verification
    CashfreeWebhook.XClientSecret = process.env.x_client_secret;

    // Verify the webhook signature
    let webhookEvent;
    try {
      webhookEvent = CashfreeWebhook.PGVerifyWebhookSignature(signature, rawBody, timestamp);
      console.log('Webhook signature verified successfully');
      console.log('Webhook data:', webhookEvent.object);
    } catch (signatureError) {
      console.error('Webhook signature verification failed:', signatureError.message);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Extract settlement data with validation
    const settlement = webhookEvent.object.data.settlement;
    const {
      settlement_id,
      payment_from,
      payment_till,
      utr,
      settled_on,
      status,
      settlement_amount
    } = settlement;

    // Validate required settlement fields
    if (!settlement_id || !utr || !settled_on) {
      console.error('Missing required settlement fields');
      return res.status(400).json({ error: 'Incomplete settlement data' });
    }

    // Process settlement reconciliation
    await processSettlementReconciliation({
      settlement_id,
      payment_from,
      payment_till,
      utr,
      settled_on
    });

    // Send email notification
    await sendSettlementNotification({
      eventType: webhookEvent.object.type,
      eventTime: webhookEvent.object.event_time,
      settlement_id,
      status,
      utr,
      settlement_amount,
      settled_on
    });

    console.log('Settlement webhook processed successfully');
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      settlement_id,
      utr
    });

  } catch (error) {
    console.error('Error processing settlement webhook:', error);
    res.status(500).json({ 
      error: 'Internal server error processing webhook',
      message: error.message 
    });
  }
};

// Helper function to process settlement reconciliation
const processSettlementReconciliation = async (settlementData) => {
  const { settlement_id, payment_from, payment_till, utr, settled_on } = settlementData;
  
  try {
    // Convert Cashfree time format to IST for comparison
    const convertToIST = (timeString) => {
      if (!timeString) return null;
      
      try {
        // Parse the time string and assume it's in IST
        const [datePart, timePart] = timeString.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute, second] = timePart.split(':');
        
        // Create date in IST (UTC+5:30)
        const istDate = new Date(Date.UTC(
          parseInt(year), 
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day),
          parseInt(hour) - 5, // Convert IST to UTC
          parseInt(minute) - 30,
          parseInt(second)
        ));
        
        return istDate.toISOString();
      } catch (timeError) {
        console.error('Error converting time format:', timeError);
        return null;
      }
    };

    const paymentFromIST = convertToIST(payment_from);
    const paymentTillIST = convertToIST(payment_till);

    console.log('Original Cashfree times:', { payment_from, payment_till });
    console.log('Converted to IST:', { paymentFromIST, paymentTillIST });

    // Update transactions for settlement
    const updateQuery = `
      UPDATE transactions
      SET is_settled = true, 
          settlement_id = $1, 
          utr = $2, 
          settled_on = $3
      WHERE payment_status = 'SUCCESS'
        AND payment_completion_time >= $4
        AND payment_completion_time <= $5
        AND payment_group NOT IN ('cash', 'visitor_payment')
        AND is_settled = false
    `;
    
    const updateValues = [settlement_id, utr, settled_on, paymentFromIST, paymentTillIST];
    const result = await db.query(updateQuery, updateValues);
    
    console.log(`Reconciliation: ${result.rowCount} transactions marked as settled for settlement_id ${settlement_id}`);
    
    return result.rowCount;
  } catch (err) {
    console.error('Error during settlement reconciliation:', err);
    throw err;
  }
};

// Helper function to send settlement notification
const sendSettlementNotification = async (notificationData) => {
  const {
    eventType,
    eventTime,
    settlement_id,
    status,
    utr,
    settlement_amount,
    settled_on
  } = notificationData;

  try {
    const mailOptions = {
      from: 'info@bninewdelhi.in',
      to: 'rawatanubhav085@gmail.com',
      cc: 'rajashukla@outlook.com',
      subject: 'Cashfree Settlement Webhook Received',
      html: `
        <h2>Cashfree Settlement Webhook Received</h2>
        <p><strong>Event Type:</strong> ${eventType}</p>
        <p><strong>Event Time:</strong> ${eventTime}</p>
        <p><strong>Settlement ID:</strong> ${settlement_id}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>UTR:</strong> ${utr}</p>
        <p><strong>Settlement Amount:</strong> ${settlement_amount}</p>
        <p><strong>Settled On:</strong> ${settled_on}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Settlement webhook notification email sent successfully');
  } catch (emailError) {
    console.error('Error sending settlement notification email:', emailError);
    // Don't throw error - email failure shouldn't break webhook processing
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