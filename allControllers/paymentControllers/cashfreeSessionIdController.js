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
    // console.log(data, "================body=================");

    try {
        const axiosResponse = await axios.post(`${process.env.cashfree_testing_url}/pg/orders`, data, { headers });
        const responseData = axiosResponse.data;

        // console.log(responseData, "=============session controller data");

        // Insert order details into Orders table
        const insertOrderData = async () => {
          try {
              // console.log(data.customer_details, "================== Customer Details =================="); // Log customer details
      
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

const getOrderStatus = async (req, res) => {
  const { order_id } = req.params;
  console.log(order_id)

  try {
    // Check if the order_id exists in the Orders table before proceeding
    const orderCheck = await db.query('SELECT * FROM Orders WHERE order_id = $1', [order_id]);
    if (orderCheck.rowCount === 0) {
      console.error("Order ID does not exist in Orders table");
      return res.status(400).json({ error: "Order ID does not exist in Orders table" });
    }

    const getOrderData = await axios.get(
      `${process.env.cashfree_testing_url}/pg/orders/${order_id}/payments`,
      { headers }
    );

    const paymentDetails = getOrderData.data[0];

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
          payment_group
        ]
      );
      console.log(getOrderData.data)

      console.log('Transaction data inserted successfully');
      res.redirect(`${process.env.baseUrl}/payment-status/${order_id}`)
    } else {
      res.redirect(`${process.env.baseUrl}/payment-status/${order_id}`)

    }
  } catch (error) {
    console.error("Error fetching order data:", error.message);
    res.redirect(`${process.env.baseUrl}/payment-status/${getOrderData.data.order_id}`)

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


module.exports = {
    sessionIdGenerator,
    getOrderStatus,
    getPaymentStatus
};
