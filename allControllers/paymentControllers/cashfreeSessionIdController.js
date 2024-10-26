const axios = require('axios');
const db = require('../../database/db');

const headers = {
    'x-client-id': process.env.x_client_id,
    'x-client-secret': process.env.x_client_secret,
    'x-api-version': process.env.x_api_version,
};

// Generate Cashfree sessionId and store order details in Orders table
const sessionIdGenerator = async (req, res) => {
    const data = req.body;
    console.log(data, "================body=================");

    try {
        const axiosResponse = await axios.post(`${process.env.cashfree_testing_url}/pg/orders`, data, { headers });
        const responseData = axiosResponse.data;

        console.log(responseData, "=============session controller data");

        // Insert order details into Orders table
        const insertOrderData = async () => {
          try {
              console.log(data.customer_details, "================== Customer Details =================="); // Log customer details
      
              await db.query(
                  `INSERT INTO Orders (order_id, order_amount, order_currency, payment_gateway_id, customer_id, chapter_id, region_id, universal_link_id, ulid, order_status, payment_session_id, one_time_registration_fee, membership_fee, tax, member_name, customer_email, customer_phone, gstin, company, mobile_number, renewal_year, payment_note)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
                  [
                      responseData.order_id,
                      responseData.order_amount,
                      responseData.order_currency,
                      data.customer_details.payment_gateway_id, // Ensure this is available
                      data.customer_details.member_id, // Use member_id from customer_details
                      data.customer_details.chapter_id, // Use chapter_id from customer_details
                      data.customer_details.region_id, // Use region_id from customer_details
                      data.customer_details.universal_link_id, // Ensure this is available
                      data.customer_details.ulid_id, // Ensure this is available
                      responseData.order_status,
                      responseData.payment_session_id,
                      data.customer_details.one_time_registration_fee, // New field
                      data.customer_details.membership_fee, // New field
                      data.customer_details.tax, // New field
                      data.customer_details.memberName, // New field
                      data.customer_details.customer_email, // New field
                      data.customer_details.customer_phone, // New field
                      data.customer_details.gstin, // New field
                      data.customer_details.company, // New field
                      data.customer_details.mobileNumber, // New field
                      data.customer_details.renewalYear, // New field
                      data.customer_details.payment_note // New field
                  ]
              );
              console.log('Order data inserted successfully');
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

// Get order status and store transaction details in Transactions table
const getOrderStatus = async (req, res) => {
    const { order_id } = req.params;

    try {
        const getOrderData = await axios.get(
            `${process.env.cashfree_testing_url}/pg/orders/${order_id}/payments`,
            { headers }
        );

        const transactions = getOrderData.data.payments;
        console.log(getOrderData.data);

        // Insert each transaction into Transactions table
        const insertTransactionData = async (transaction) => {
            try {
                await db.query(
                    `INSERT INTO Transactions (cf_payment_id, order_id, payment_gateway_id, payment_amount, payment_currency, payment_status, payment_message, payment_time, payment_completion_time, bank_reference, auth_id, payment_method, error_details, auth_details)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                    [
                        transaction.cf_payment_id,
                        transaction.order_id,
                        data.customer_details.payment_gateway_id, // Get payment_gateway_id from customer_details
                        transaction.payment_amount,
                        transaction.payment_currency,
                        transaction.payment_status,
                        transaction.payment_message,
                        transaction.payment_time,
                        transaction.payment_completion_time,
                        transaction.bank_reference,
                        transaction.auth_id,
                        transaction.payment_method,
                        transaction.error_details,
                        transaction.authorization
                    ]
                );
                console.log('Transaction data inserted successfully');
            } catch (error) {
                console.error('Error inserting transaction data:', error);
            }
        };

        // Process and insert each transaction
        for (const transaction of transactions) {
            await insertTransactionData(transaction);
        }

        res.json(getOrderData.data);
    } catch (error) {
        console.error("Error fetching order data:", error.message);
        res.status(500).json({ error: "Error fetching order data" });
    }
};

module.exports = {
    sessionIdGenerator,
    getOrderStatus
};
