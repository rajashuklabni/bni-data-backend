require('dotenv').config();
const axios = require('axios');
const db = require('../../database/db');
const { Client } = require('pg');  // Import PostgreSQL client
const crypto = require('crypto');
const moment = require('moment');


// Initialize Axios client with base URL and headers
const apiClient = axios.create({
  baseURL: 'https://api.prod.core.irisirp.com',
  headers: {
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET,
    'gstin': process.env.GSTIN
  }
});

// Encrypt data function
async function encryptData() {
  try {
    const payload = {
      type: "PUB",
      data: JSON.stringify({
        UserName: "sunilk",
        Password: process.env.PASSWORD,
        AppKey: process.env.APP_KEY,
        ForceRefreshAccessToken: true
      }),
      key: process.env.KEY
    };

    // Encrypt user data
    const response = await apiClient.post('/crypto/encrypt', payload);
    return response.data.Data;
  } catch (error) {
    console.error("Encryption Error:", error.message);
    throw new Error("Failed to encrypt data");
  }
}

// Authenticate user function
async function authenticateUser(encryptedData) {
  try {
    // Use the encrypted data in the authentication payload
    const authResponse = await apiClient.post('/eivital/v1.04/auth', { Data: encryptedData });
    console.log(authResponse.data);
    const { AuthToken, Sek } = authResponse.data.Data;

    return { AuthToken, Sek };
  } catch (error) {
    console.error("Authentication Error:", error.message);
    throw new Error("Failed to authenticate user");
  }
}

// Function to store tokens in the database
async function storeTokens(authToken, sek) {
  try {
    // Use the already connected `db` client (don't call db.connect() again)
    
    // SQL query to insert tokens into the authTokens table
    const query = `
      INSERT INTO authTokens (authToken, sek, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    // Execute the query with the db client
    await db.query(query, [authToken, sek]);
    console.log("Tokens stored successfully!");

  } catch (err) {
    console.error("Error storing tokens:", err.message);
  }
}


// Get token function for handling request
async function getToken(req, res) {
  try {
    // Step 1: Encrypt data
    const encryptedData = await encryptData();
    console.log("Encrypted Data:", encryptedData);

    // Step 2: Authenticate using encrypted data
    const { AuthToken, Sek } = await authenticateUser(encryptedData);
    console.log("Auth Token:", AuthToken);
    console.log("Sek:", Sek);

    // Step 3: Decrypt SEK if necessary
    const decryptedSek = await decryptData(AuthToken, Sek);
    console.log("Decrypted Sek:", decryptedSek);

    // Store the decrypted SEK and AuthToken in the database
    await storeTokens(AuthToken, decryptedSek); // Save the tokens in the database

    // Respond with the decrypted SEK and AuthToken
    res.json({ authToken: AuthToken, sek: decryptedSek });

  } catch (error) {
    console.error("Token Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Decrypt SEK function
async function decryptData(authToken, sek) {
  try {
    const payload = {
      type: "KEY",
      data: sek,
      key: process.env.APP_KEY
    };
    const response = await apiClient.post('/crypto/decrypt', payload);
    return response.data.Data;
  } catch (error) {
    console.error("Decryption Error:", error.message);
    throw new Error("Failed to decrypt SEK");
  }
}

// ******************************GENERATING IRN - E-INVOICE************************************

let docNumber = 1;

async function generateIRN(req, res) {
  try {

    console.log("Received Request Body:", req.body);
    const order_id = req.body.orderId.order_id;

    // Step 1: Check if a document number already exists for this order
    const existingDocQuery = 'SELECT doc_no FROM DocumentNumbers WHERE order_id = $1';
    const existingDocResult = await db.query(existingDocQuery, [order_id]);

    let docNo;

    if (existingDocResult.rows.length > 0) {
      // If a document number already exists, use it
      docNo = existingDocResult.rows[0].doc_no;
    } else {
      // Step 2: Get the latest doc_no from the database
      const lastDocQuery = 'SELECT doc_no FROM DocumentNumbers ORDER BY created_at DESC LIMIT 1';
      const lastDocResult = await db.query(lastDocQuery);

      // Extract the numeric part of the last doc_no and increment it
      let newDocNumber = 1;  // Start from 1 if no records exist

      if (lastDocResult.rows.length > 0) {
        const lastDocNo = lastDocResult.rows[0].doc_no;
        const lastNumber = parseInt(lastDocNo.split('/')[1], 10);
        newDocNumber = lastNumber + 1;
      }

       // Step 3: Generate the new doc_no with incremented number
       docNo = `DOC/${newDocNumber}`;

       // Step 4: Insert the new doc_no into DocumentNumbers table
       const insertDocQuery = 'INSERT INTO DocumentNumbers (doc_no, order_id) VALUES ($1, $2)';
       await db.query(insertDocQuery, [docNo, order_id]);
     }

     console.log("Generated Document Number:", docNo);
    // Step 1: Retrieve stored tokens from the database
    const query = 'SELECT * FROM authTokens ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query);

    if (result.rows.length === 0) {
      throw new Error("No tokens found in the database.");
    }
    const { authtoken, sek } = result.rows[0];  // Fetch the most recent token
    const member_id = req.body.orderId.customer_id;
    console.log("member id", member_id);
    const memberResponse = await axios.get(`https://bni-data-backend.onrender.com/api/getMember/${member_id}`);
    const memberData = memberResponse.data;
    const gstin = memberData.member_gst_number;

    if (!memberData || memberData.length === 0) {
      throw new Error("GST and address details not found.");
    }

    const stateCode = gstin.substring(0, 2);

    // Populate address fields from member data
    const buyerDetails = {
      Addr1: memberData.member_company_address || "Address not found",
      Addr2: memberData.member_company_address || "",
      Loc: memberData.member_company_state || "GANDHINAGAR",
      Pos: stateCode,
      Pin: memberData.address_pincode || 110001,
      Stcd: stateCode,  // Extract state code from GSTIN
      Ph: req.body.orderId.customer_phone,
      Em: req.body.orderId.customer_email,
      LglNm: req.body.orderId.company,
      TrdNm: req.body.orderId.company,
      Gstin: memberData.member_gst_number
    };

    console.log("buyer details", buyerDetails);

    // Increment document number and format the date
    const docDate = moment().format("DD/MM/YYYY");

    // Calculate Base Price and UnitPrice
    const orderAmount = parseFloat(req.body.orderId.order_amount);  // Total amount with GST
    const gstAmount = parseFloat(req.body.orderId.tax);  // GST value
    const basePrice = (orderAmount / 1.18).toFixed(2);  // Base Price calculation with two decimal places
console.log("Calculated Base Price:", basePrice);


    // Print the authToken and sek to the console
    console.log("AuthToken:", authtoken);
    console.log("SEK:", sek);

    // Calculate IGST, CGST, and SGST based on the buyer's state code
let igstAmount = 0;
let cgstAmount = 0;
let sgstAmount = 0;

// If the buyer's state code is the same as the seller (Delhi - state code 07), it's an intra-state transaction
if (buyerDetails.Stcd === "07") {
  cgstAmount = parseFloat(req.body.orderId.tax) / 2;  // Split tax equally between CGST and SGST
  sgstAmount = parseFloat(req.body.orderId.tax) / 2;
} else {
  // For inter-state transaction, all tax goes to IGST
  igstAmount = parseFloat(req.body.orderId.tax);
}

console.log(cgstAmount, sgstAmount, igstAmount);

    // Step 2: Encrypt the IRN data payload
    const payload = {
      type: "SEK",
      data: JSON.stringify({
        "Version": "1.1",
        "TranDtls": {
          "TaxSch": "GST",
          "SupTyp": "B2B",
          "RegRev": "Y",
          "EcmGstin": null,
          "IgstOnIntra": "N"
        },
        "DocDtls": {
          "Typ": "INV",
          "No": docNo,
          "Dt": docDate
        },
        "SellerDtls": {
          "Gstin": "07EVVPS9453K4Z8",
          "LglNm": "National Marketing Projects INC.",
          "TrdNm": "National Marketing Projects INC.",
          "Addr1": "DDA SFS Flat Flat No. 12 Pocket 1 Sector 19 Dwarka Delhi",
          "Loc": "GANDHINAGAR",
          "Pin": 110075,
          "Stcd": "07",
          "Ph": "9000000000",
          "Em": "abc@gmail.com"
        },
        "BuyerDtls": buyerDetails,
        "ShipDtls": buyerDetails,
        "ItemList": [
          {
            "SlNo": "1",
            "PrdDesc": "Rice",
            "IsServc": "N",
            "HsnCd": "1001",
            "Barcde": "123456",
            "Qty": 1,
            "Unit": "BAG",
            "UnitPrice": basePrice,
            "TotAmt": basePrice,
            "Discount": 0,
            "AssAmt": basePrice,
            "GstRt": 18.0,
            "IgstAmt": 0,
            "CgstAmt": cgstAmount,
            "SgstAmt": sgstAmount,
            "TotItemVal": parseFloat(req.body.orderId.order_amount),
          }
        ],
        "ValDtls": {
          "AssVal": basePrice,
          "IgstVal":0,
          "CgstVal": cgstAmount,
          "SgstVal": sgstAmount,
          "TotInvVal": parseFloat(req.body.orderId.order_amount)
        },
        "PayDtls": {
          "Nm": req.body.gatewayName,
          "AccDet": "5697389713210",
          "Mode": "Cash",
          "PayTerm": "100",
          "PayInstr": req.body.orderId.payment_note,
        },
      }),
      key: sek
    };

    const encryptedPayload = JSON.stringify(payload);
    console.log("Encrypted Payload:", encryptedPayload);

    // Step 3: Encrypt IRN payload
    const encryptionResponse = await apiClient.post('/crypto/encrypt', payload, {
      headers: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        gstin: process.env.GSTIN,
        user_name: "sunilk",
        AuthToken: authtoken
      }
    });
    
    const encryptedIRNData = encryptionResponse.data.Data;
    console.log("Encrypted IRN Data:", encryptedIRNData);

    // Step 4: Send encrypted data to the IRN generation endpoint
    const irnResponse = await apiClient.post('/eicore/v1.03/Invoice', { Data: encryptedIRNData }, {
      headers: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        gstin: process.env.GSTIN,
        user_name: "sunilk",
        AuthToken: authtoken
      }
    });

    console.log("IRN Generation Response:", irnResponse.data);

    const decryptedData = await decryptIrnData(irnResponse.data.Data, sek);  // Ensure to pass the encrypted data properly
    console.log("Decrypted IRN Data:", decryptedData);

    const response = decryptedData;
    const decryptedDataa = JSON.parse(response); // parse the JSON data

console.log("AckNo:", decryptedDataa.AckNo);
console.log("AckDt:", decryptedDataa.AckDt);
console.log("IRN:", decryptedDataa.Irn);
console.log("QR Code:", decryptedDataa.SignedQRCode);

// Insert the decrypted IRN data into the einvoice table
const insertEInvoiceQuery = `
INSERT INTO einvoice (order_id, transaction_id, member_id, ack_no, ack_dt, irn, qrcode)
VALUES ($1, $2, $3, $4, $5, $6, $7)
`;

const transaction_id = req.body.transactionId.transaction_id; // Assuming transaction_id is in the request body
    await db.query(insertEInvoiceQuery, [
      order_id,
      transaction_id,
      member_id,
      decryptedDataa.AckNo,
      decryptedDataa.AckDt,
      decryptedDataa.Irn,
      decryptedDataa.SignedQRCode
    ]);

    console.log("IRN Data saved to einvoice table");

    // Send success response to frontend
    return res.status(200).json({
      message: "IRN and QR code generated successfully",
      data: {
        ackNo: decryptedDataa.AckNo,
        ackDate: decryptedDataa.AckDt,
        irn: decryptedDataa.Irn,
        qrCode: decryptedDataa.SignedQRCode
      }
    });

  } catch (error) {
    console.error("IRN Generation Error:", error.message);
    // Send error details to the frontend
    return res.status(500).json({
      message: "Failed to generate IRN",
      error: error.message
    });
  }
}

// Function to decrypt IRN data
async function decryptIrnData(encryptedData, sek) {
  try {
    const payload = {
      type: "SEK",
      data: encryptedData,
      key: sek
    };

    const response = await apiClient.post('/crypto/decrypt', payload);

    return response.data.Data;  // Return the decrypted data directly

  } catch (error) {
    console.error("Decryption Error:", error.message);
    throw new Error("Failed to decrypt IRN");
  }
}


// ******************************* cancel irn *************************************

async function cancelIRN(req, res) {
  try {
      const { Irn, CnlRem } = req.body;
      console.log("req data", req.body);

      // Step 1: Retrieve stored tokens from the database
    const query = 'SELECT * FROM authTokens ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query);

    if (result.rows.length === 0) {
      throw new Error("No tokens found in the database.");
    }

    const { authtoken, sek } = result.rows[0];  // Fetch the most recent token

      const encryptPay = {
        type: "SEK",
        data: JSON.stringify({
          "Irn": Irn,
          "CnlRsn": "1",
          "CnlRem": CnlRem,
        }),
        key: sek
      };
      const encryptedPayload = JSON.stringify(encryptPay);
      console.log(encryptedPayload);

      const encryptResponse = await apiClient.post('/crypto/encrypt', encryptPay, {
          headers: {
              client_id: process.env.CLIENT_ID,
              client_secret: process.env.CLIENT_SECRET,
              gstin: process.env.GSTIN,
              user_name: "sunilk",
              AuthToken: authtoken
          }
      });

      if (!encryptResponse.data.Data) {
          throw new Error("Encryption failed.");
      }
      const encryptedData = encryptResponse.data.Data;

      // Step 2: Send Encrypted Data to Cancel IRN API
      console.log("encrypt data", encryptedData);

      const cancelResponse = await apiClient.post('/eicore/v1.03/Invoice/Cancel', { Data: encryptedData }, {
          headers: {
              client_id: process.env.CLIENT_ID,
              client_secret: process.env.CLIENT_SECRET,
              gstin: process.env.GSTIN,
              user_name: "sunilk",
              AuthToken: authtoken
          }
      });
      console.log("cancel irn response", cancelResponse.data.Data);

      if (!cancelResponse.data.Data) {
          throw new Error("IRN cancellation failed.");
      }

      const decryptedCancelData = await decryptCancelIrnData(cancelResponse.data.Data, sek);  // Ensure to pass the encrypted 

      console.log("Decrypted cancel IRN Data:", decryptedCancelData);

      // Step 4: Fetch order_id from einvoice table where irn = Irn
    const orderQuery = 'SELECT order_id FROM einvoice WHERE irn = $1';
    const orderResult = await db.query(orderQuery, [Irn]);

    if (orderResult.rows.length === 0) {
      throw new Error("Order ID not found for the given IRN.");
    }

    const order_id = orderResult.rows[0].order_id;
    console.log("Fetched Order ID:", order_id);

    console.log("Inserting into cancel_irn:", {
      irn: Irn,
      cancel_date: decryptedCancelData.CancelDate,
      cancel_reason: CnlRem,
      order_id: order_id
  });

    // Step 5: Insert Cancelled IRN Data into cancel_irn table
    const insertQuery = `
      INSERT INTO cancel_irn (irn, cancel_date, cancel_reason, order_id) 
      VALUES ($1, $2, $3, $4) RETURNING *`;

      const insertResult = await db.query(insertQuery, [
        Irn, 
        decryptedCancelData.CancelDate, 
        CnlRem, 
        order_id
      ]);

      console.log("Inserted into cancel_irn:", insertResult.rows[0]);


      // Send success response to frontend
      return res.status(200).json({
        success: true,  // Add success field
        message: "IRN Cancel Successfully",
        data: {
          irn: decryptedCancelData.Irn,
          CancelDate: decryptedCancelData.CancelDate
        }
      });
      

  } catch (error) {
      console.error("Cancel IRN Error:", error.message);
      res.status(500).json({ error: error.message });
  }
}

// Function to decrypt IRN data
async function decryptCancelIrnData(encryptedData, sek) {
  try {
    const payload = {
      type: "SEK",
      data: encryptedData,
      key: sek
    };

    const response = await apiClient.post('/crypto/decrypt', payload);

    return response.data.Data;  // Return the decrypted data directly

  } catch (error) {
    console.error("Decryption Error:", error.message);
    throw new Error("Failed to decrypt IRN");
  }
}

// **************************** get gst details *************************************


// Function to Get GST Details
async function getGstDetails(req, res) {
  try {
    const gstNo = req.params.gstNo;

    if (!gstNo) {
      return res.status(400).json({ error: "GST Number is required." });
    }

    // Step 1: Retrieve stored tokens from the database
    const query = 'SELECT * FROM authTokens ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query);

    if (result.rows.length === 0) {
      throw new Error("No tokens found in the database.");
    }

    const { authtoken, sek } = result.rows[0];  // Fetch the most recent token

    // Step 2: Call the GST API
    const gstResponse = await apiClient.get(`/eivital/v1.04/Master/gstin/${gstNo}`, {
      headers: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        gstin: process.env.GSTIN,
        user_name: "sunilk",
        AuthToken: authtoken
      }
    });

    if (!gstResponse.data || !gstResponse.data.Data) {
      throw new Error("Invalid response from GST API.");
    }

    const encryptedData = gstResponse.data.Data;

    // Step 3: Decrypt the GST Data
    const decryptResponse = await apiClient.post('/crypto/decrypt', {
      type: "SEK",
      data: encryptedData,
      key: sek
    }, {
      headers: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        gstin: process.env.GSTIN,
        user_name: "sunilk",
        AuthToken: authtoken
      }
    });

    if (!decryptResponse.data || !decryptResponse.data.Data) {
      throw new Error("Failed to decrypt GST details.");
    }

    let gstDetails = decryptResponse.data.Data;
    // Ensure gstDetails is a valid object
    if (typeof gstDetails === 'string') {
      gstDetails = JSON.parse(gstDetails);  // Parse if it's a string
    }

    if (!gstDetails || typeof gstDetails !== 'object') {
      throw new Error("Invalid GST details format.");
    }
    // Extract GST details safely
    const extractedDetails = {
      gstin: gstDetails.gstin || "N/A",
      tradeName: gstDetails.tradeName || "N/A",
      legalName: gstDetails.legalName || "N/A",
      address: `${gstDetails.addrBno || "N/A"}, ${gstDetails.addrFlno || "N/A"}, ${gstDetails.addrSt || "N/A"}, ${gstDetails.addrLoc || "N/A"}, ${gstDetails.stateCode || "N/A"} - ${gstDetails.addrPncd || "N/A"}`,
      taxpayerType: gstDetails.txpType || "N/A",
      status: gstDetails.status || "N/A",
      registrationDate: gstDetails.dtReg || "N/A"
    };

    console.log(extractedDetails);

    // Step 4: Send Response
    res.status(200).json({ success: true, extractedDetails });

  } catch (error) {
    console.error("Error fetching GST details:", error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getToken, generateIRN, cancelIRN, getGstDetails};
