const ccav = require("../../CC-Avenue-Kit/ccavutil.js");
const db = require("../../database/db");

// CCAvenue encryption function
function encrypt(plainText, workingKey) {
  const m = crypto.createHash("md5");
  m.update(workingKey);
  const key = m.digest();
  const iv = "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f";
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  let encoded = cipher.update(plainText, "utf8", "hex");
  encoded += cipher.final("hex");
  return encoded;
}

// CCAvenue decryption function
function decrypt(encText, workingKey) {
  const m = crypto.createHash("md5");
  m.update(workingKey);
  const key = m.digest();
  const iv = "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f";
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  let decoded = decipher.update(encText, "hex", "utf8");
  decoded += decipher.final("utf8");
  return decoded;
}

const generateCCAvenueOrder = async (req, res) => {
  try {
    // Token validation is handled by middleware
    const orderData = req.body;

    // Validate the request data
    if (!orderData || !orderData.order_amount || !orderData.customer_details) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    // Generate a unique order ID
    const orderId = `CCAV${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 5)}`;

    // Prepare merchant parameters
    const merchantParams = {
      merchant_id: process.env.CCAVENUE_MERCHANT_ID,
      order_id: orderId,
      currency: "INR",
      amount: orderData.order_amount,
      redirect_url: `${process.env.BACKEND_URL}/api/ccavenue-response`,
      cancel_url: `${process.env.BACKEND_URL}/api/ccavenue-response`,
      language: "EN",
      billing_name: orderData.customer_details.Customer_name,
      billing_address: orderData.customer_details.address || "NA",
      billing_city: orderData.customer_details.city || "NA",
      billing_state: orderData.customer_details.state || "NA",
      billing_zip: orderData.customer_details.pincode || "000000",
      billing_country: "India",
      billing_tel: orderData.customer_details.customer_phone,
      billing_email: orderData.customer_details.customer_email,
      merchant_param1: JSON.stringify(orderData.customer_details),
      integration_type: "iframe_normal",
    };

    // Convert to query string
    const merchantData = Object.entries(merchantParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    // Encrypt the data using CCAvenue encryption
    const encryptedData = ccav.encrypt(
      merchantData,
      process.env.CCAVENUE_WORKING_KEY
    );

    // Save order details to database
    await db.query(
      `INSERT INTO orders (order_id, amount, customer_details, payment_gateway, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        orderData.order_amount,
        JSON.stringify(orderData.customer_details),
        "ccavenue",
        "INITIATED",
      ]
    );

    res.json({
      success: true,
      encryptedData,
      accessCode: process.env.CCAVENUE_ACCESS_CODE,
      redirectUrl:
        "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction",
      orderId,
    });
  } catch (error) {
    console.error("Error generating CCAvenue order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CCAvenue order",
      error: error.message,
    });
  }
};

const handleCCAvenueResponse = async (req, res) => {
  try {
    const { encResp } = req.body;

    if (!encResp) {
      throw new Error("No encrypted response received");
    }

    // Decrypt the response
    const decryptedResponse = decrypt(
      encResp,
      process.env.CCAVENUE_WORKING_KEY
    );
    const responseParams = new URLSearchParams(decryptedResponse);

    const order_id = responseParams.get("order_id");
    const tracking_id = responseParams.get("tracking_id");
    const bank_ref_no = responseParams.get("bank_ref_no");
    const order_status = responseParams.get("order_status");
    const payment_mode = responseParams.get("payment_mode");
    const amount = responseParams.get("amount");

    // Update order status
    await db.query(`UPDATE orders SET status = $1 WHERE order_id = $2`, [
      order_status,
      order_id,
    ]);

    // Handle successful payment
    if (order_status.toLowerCase() === "success") {
      await db.query(
        `INSERT INTO transactions (
          order_id, payment_gateway_id, payment_amount, 
          payment_currency, payment_status, payment_message,
          payment_time, bank_reference, payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order_id,
          2, // CCAvenue payment_gateway_id
          amount,
          "INR",
          "SUCCESS",
          "Transaction successful",
          new Date(),
          bank_ref_no,
          payment_mode,
        ]
      );

      res.redirect(`${process.env.FRONTEND_URL}/success?order_id=${order_id}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/failed?order_id=${order_id}`);
    }
  } catch (error) {
    console.error("Error handling CCAvenue response:", error);
    res.redirect(`${process.env.FRONTEND_URL}/failed`);
  }
};

const getCCAvenueOrderStatus = async (req, res) => {
  try {
    const { order_id } = req.params;

    const result = await db.query(
      `SELECT o.*, t.* 
             FROM Orders o 
             LEFT JOIN Transactions t ON o.order_id = t.order_id 
             WHERE o.order_id = $1`,
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching CCAvenue order status:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order status",
      error: error.message,
    });
  }
};

module.exports = {
  generateCCAvenueOrder,
  handleCCAvenueResponse,
  getCCAvenueOrderStatus,
};
