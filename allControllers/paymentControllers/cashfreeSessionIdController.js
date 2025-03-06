const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const db = require('../../database/db');
const { Cashfree } = require('cashfree-pg');
const crypto = require('crypto');
const app = express();

// Set up Cashfree SDK with environment variables
Cashfree.XClientId = process.env.x_client_id;
Cashfree.XClientSecret = process.env.x_client_secret;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;  // Use SANDBOX for testing

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
                  data.visitor_name.mobileNumber|| null,
                  data.visitor_name.address|| null,
                  data.visitor_name.company|| null,
                  data.visitor_name.gstin|| null,
                  data.visitor_name.business|| null,
                  data.visitor_name.company_address || null


              ];
              await db.query(
                `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id,visitor_name,visitor_email,visitor_mobilenumber,visitor_address,visitor_company,visitor_gstin,visitor_business,visitor_company_address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)`,
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
                data.visitor_name.company_address || null


            ];
            await db.query(
              `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id,visitor_id,visitor_name,visitor_email,visitor_mobilenumber,visitor_address,visitor_company,visitor_gstin,visitor_business,visitor_company_address)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)`,
              orderValues
          );
          }
          else {
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
            ];

            await db.query(
              `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note, training_id, event_id, kitty_bill_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
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
                            const transactionResponse = await axios.get('https://bni-data-backend.onrender.com/api/allTransactions');
                            const transactions = transactionResponse.data;
                            
                            const relevantTransaction = transactions.find(t => t.order_id === responseData.order_id);
                            console.log('📊 Found transaction:', relevantTransaction);
                            
                            if (relevantTransaction && relevantTransaction.payment_status === 'SUCCESS') {
                                console.log('💰 Found successful transaction:', relevantTransaction.cf_payment_id);
                                
                                // Get training details
                                const trainingResponse = await axios.get('https://bni-data-backend.onrender.com/api/allTrainings');
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
                                        await axios.post('https://bni-data-backend.onrender.com/api/send-qr-code', qrCodeData);
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
           error_details, gateway_order_id, gateway_payment_id, payment_group)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
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
        ]
      );

      console.log('Transaction data inserted successfully');

      // here added by vasu
      const balance_data = {
        chapter_id: responseData1.chapter_id,
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
          // db query
          console.log("adding in db.....");
          
    const creditResponse = await fetch("https://bni-data-backend.onrender.com/api/getAllMemberCredit");
    const creditData = await creditResponse.json();

    // Filter credits based on member_id and chapter_id
    const filteredCredits = creditData.filter(credit => 
        credit.member_id === balance_data.member_id && 
        credit.chapter_id === balance_data.chapter_id && 
        credit.is_adjusted === false
    );

    // Update is_adjusted to true for all found entries
    for (const credit of filteredCredits) {
        await db.query(`
            UPDATE memberkittycredit 
            SET is_adjusted = true 
            WHERE credit_id = $1`, [credit.credit_id]
        );
    }

    console.log("Updated is_adjusted to true for filtered credits");
    const newAmountToPay = parseFloat(orderData.order_amount) - parseFloat(orderData.tax);
    // now i have to do like if penalty is 0 then means penalty is added in orderamount
    // else not added 
    // so in if case i will do 
    if(responseData1.penalty_amount > 0){
      const updateQuery = `
          UPDATE bankorder 
          SET amount_to_pay = amount_to_pay - $1,
              no_of_late_payment = $2,
              kitty_penalty = $3
          WHERE member_id = $4
      `;
      console.log("bankorder penalty ",responseData1.penalty_amount);
      console.log("bankorder no of late payment ",responseData1.no_of_late_payment);

      const values = [Math.round(newAmountToPay), responseData1.no_of_late_payment, responseData1.penalty_amount,balance_data.member_id];
      await db.query(updateQuery, values);
      console.log("Updated amount_to_pay in bankorder for member_id:", balance_data.member_id);
    }
    else{

      const bankOrderResponse = await fetch("https://bni-data-backend.onrender.com/api/getbankOrder");
      const bankOrderData = await bankOrderResponse.json();

      // Filter bank orders based on member_id
      const filteredBankOrders = bankOrderData.filter(order => order.member_id === balance_data.member_id);

      console.log("Filtered bank orders for member_id:", balance_data.member_id, filteredBankOrders);



      const updateQuery = `
          UPDATE bankorder 
          SET amount_to_pay = amount_to_pay + $1 - $2,
              no_of_late_payment = $3,
              kitty_penalty = $4,
              kitty_due_date = $5
          WHERE member_id = $6
      `;
      console.log("bankorder penalty ", responseData1.penalty_amount);
      console.log("bankorder no of late payment ", responseData1.no_of_late_payment);

      const values = [filteredBankOrders[0].kitty_penalty, Math.round(newAmountToPay), responseData1.no_of_late_payment, responseData1.penalty_amount, null, balance_data.member_id];
      await db.query(updateQuery, values);
      console.log("Updated amount_to_pay in bankorder for member_id:", balance_data.member_id);
    }

      // const updateQuery = `
      //     UPDATE bankorder 
      //     SET amount_to_pay = amount_to_pay - $1,
      //         no_of_late_payment = $2,
      //         kitty_penalty = $3
      //     WHERE member_id = $4
      // `;
      // console.log("bankorder penalty ",responseData1.penalty_amount);
      // console.log("bankorder no of late payment ",responseData1.no_of_late_payment);

      // const values = [Math.round(newAmountToPay), responseData1.no_of_late_payment, responseData1.penalty_amount,balance_data.member_id];
      // await db.query(updateQuery, values);
      // console.log("Updated amount_to_pay in bankorder for member_id:", balance_data.member_id);
    
        }
        const getvisitorData = await axios.get(
          "https://bni-data-backend.onrender.com/api/getAllVisitors"
        );
        // console.log("---",getvisitorData.data);
        const matchedVisitor = getvisitorData.data.find(visitor => visitor.visitor_phone === responseData1.visitor_name.mobileNumber);

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
            
            const query = 'UPDATE Visitors SET visitor_form = $1 WHERE visitor_id = $2';
            const values = [true, matchedVisitor.visitor_id];

             await db.query(query, values)
              .then(res => console.log("Update successful"))
              .catch(err => console.error("Error updating visitor:", err));
              console.log('Visitor data updated successfully', );

          } else {
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
          visitor_phone:responseData1.visitor_name.mobileNumber|| null,
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
            console.log("Matched visitor:", matchedVisitor.visitor_phone);
            const query = 'UPDATE Visitors SET new_member_form = $1 WHERE visitor_id = $2';
            const values = [true, matchedVisitor.visitor_id];

             await db.query(query, values)
              .then(res => console.log("Update successful"))
              .catch(err => console.error("Error updating visitor:", err));
              console.log('Visitor data updated successfully', );
  
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
          visitor_phone:responseData1.visitor_name.mobileNumber|| null,
          visitor_company_name: responseData1.visitor_name.company|| null,
          visitor_company_address: responseData1?.visitor_name?.company_address || null,
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
          new_member_form : true
        };

        await db.query(
          `INSERT INTO Visitors (region_id, chapter_id, invited_by, invited_by_name, visitor_name, visitor_email, visitor_phone, visitor_company_name, visitor_company_address, visitor_address, visitor_gst, visitor_business, visitor_category, visited_date, total_amount, sub_total, tax, delete_status, active_status,order_id,new_member_form)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          Object.values(visitorValues)
        );
        console.log('New member data added in Visitor db inserted successfully', visitorValues);
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
    

      console.log('Settlement data inserted successfully');
      res.status(200).json({ message: 'Settlement data stored successfully', settlementData });

  } catch (error) {
      console.error('Error fetching settlement status:', error.response ? error.response.data : error.message);
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
          return res.status(404).json({ error: `No settlement found with cf_settlement_id: ${cf_settlement_id}` });
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



module.exports = {
    sessionIdGenerator,
    getOrderStatus,
    getPaymentStatus,
    getSettlementStatus,
    getSettlementByCfPaymentId,
    getOrderByTrainingId,
};