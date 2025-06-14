require('dotenv').config();
const axios = require('axios');
const db = require('../../database/db');
const { Client } = require('pg');  // Import PostgreSQL client
const crypto = require('crypto');
const moment = require('moment');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');

// Add Delhi zipcodes at the top of the file
const delhiZipCodes = ["110080", "110081", "110082", "110083", "110084", "110085", "110086", "110087", "110088", "110089", "110090", "110091", "110092", "110093", "110094", "110095", "110096", "110097", "110099", "110110", "110001", "110002", "110003", "110004", "110005", "110006", "110007", "110008", "110009", "110010", "110011", "110012", "110013", "110014", "110015", "110016", "110017", "110018", "110019", "110020", "110021", "110022", "110023", "110024", "110025", "110026", "110027", "110028", "110029", "110030", "110031", "110032", "110033", "110034", "110035", "110036", "110037", "110038", "110039", "110040", "110041", "110042", "110043", "110044", "110045", "110046", "110047", "110048", "110049", "110051", "110052", "110053", "110054", "110055", "110056", "110057", "110058", "110059", "110060", "110061", "110062", "110063", "110064", "110065", "110066", "110067", "110068", "110069", "110070", "110071", "110072", "110073", "110074", "110075", "110076", "110077", "110078"];

// Function to convert number to words
function numberToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanThousand(n) {
    if (n === 0) return '';
    
    if (n < 20) return ones[n];
    
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertLessThanThousand(n % 100) : '');
  }
  
  // Convert the amount to a fixed 2 decimal number
  let rupeesValue = Math.floor(amount);
  const paise = Math.round((amount - rupeesValue) * 100);
  
  if (rupeesValue === 0 && paise === 0) return 'Zero Rupees';
  
  let result = '';
  
  if (rupeesValue > 0) {
    if (rupeesValue >= 10000000) {
      result += convertLessThanThousand(Math.floor(rupeesValue / 10000000)) + ' Crore ';
      rupeesValue %= 10000000;
    }
    
    if (rupeesValue >= 100000) {
      result += convertLessThanThousand(Math.floor(rupeesValue / 100000)) + ' Lakh ';
      rupeesValue %= 100000;
    }
    
    if (rupeesValue >= 1000) {
      result += convertLessThanThousand(Math.floor(rupeesValue / 1000)) + ' Thousand ';
      rupeesValue %= 1000;
    }
    
    result += convertLessThanThousand(rupeesValue);
    result += ' Rupees';
  }
  
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return result + ' Only';
}

// Initialize Axios client with base URL and headers
const apiClient = axios.create({
  baseURL: 'https://api.prod.core.irisirp.com/',
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

// Function to format document number to match required pattern
function formatDocumentNumber(docNo) {
  // The new format PROL/MP-04/00001 already matches the required pattern
  // '^([a-zA-Z1-9]{1}[a-zA-Z0-9/-]{0,15})$'
  // It starts with a letter and contains only letters, numbers, forward slash, and hyphen
  // No need to modify it further
  return docNo;
}

// ******************************GENERATING IRN - E-INVOICE************************************

// let docNumber = 1;

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
      console.log("Using existing document number:", docNo);
    } else {
      // Generate a new document number
      console.log("Generating new document number");
      
      // Step 2: Get all document numbers from the database to find the highest number
      const allDocsQuery = 'SELECT doc_no FROM DocumentNumbers';
      const allDocsResult = await db.query(allDocsQuery);
      
      // Extract the numeric part from all document numbers and find the highest
      let newDocNumber = 1;  // Start from 1 if no records exist
      
      if (allDocsResult.rows.length > 0) {
        console.log("Found", allDocsResult.rows.length, "document numbers in database");
        
        // Extract all numeric parts from document numbers
        const docNumbers = allDocsResult.rows.map(row => {
          const match = row.doc_no.match(/\/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        });
        
        // Find the highest number
        newDocNumber = Math.max(...docNumbers) + 1;
        console.log("Highest document number found:", Math.max(...docNumbers));
        console.log("New document number will be:", newDocNumber);
      } else {
        console.log("No previous document numbers found, starting with 1");
      }

      // Step 3: Get chapter name from API
      const chapter_id = req.body.orderId.chapter_id;
      console.log("Fetching chapter with ID:", chapter_id);
      
      try {
        const chapterResponse = await axios.get(`https://backend.bninewdelhi.com/api/chapters`);
        const chapters = chapterResponse.data;
        console.log("Chapters fetched:", chapters.length);
        
        // Find the chapter by ID
        const chapter = chapters.find(ch => ch.chapter_id === chapter_id);
        if (!chapter) {
          console.error(`Chapter with ID ${chapter_id} not found`);
          throw new Error(`Chapter with ID ${chapter_id} not found`);
        }
        
        console.log("Found chapter:", chapter);
        
        // Get first 4 letters of chapter name
        const chapterPrefix = chapter.chapter_name.substring(0, 4).toUpperCase();
        console.log("Chapter prefix:", chapterPrefix);
        
        // Step 4: Determine payment type based on payment_note
        let paymentType;
        const paymentNote = req.body.orderId.payment_note;
        console.log("Payment note:", paymentNote);
        
        switch(paymentNote) {
          case 'meeting-payments':
            paymentType = 'MP';
            break;
          case 'visitor-payment':
          case 'Visitor Payment':
            paymentType = 'VP';
            break;
          case 'All Training Payments':
            paymentType = 'TP';
            break;
          case 'New Member Payment':
            paymentType = 'MF';
            break;
          default:
            paymentType = 'BP';
        }
        
        console.log("Payment type determined:", paymentType);
        
        // Step 5: Get current month number (01-12)
        const currentDate = new Date();
        const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Convert to 2-digit format
        console.log("Current month:", currentMonth);
        
        // Step 6: Generate the new doc_no with the new format
        docNo = `${chapterPrefix}/${paymentType}-${currentMonth}/${newDocNumber.toString().padStart(5, '0')}`;
        console.log("Generated new document number:", docNo);

        // Step 7: Insert the new doc_no into DocumentNumbers table
        const insertDocQuery = 'INSERT INTO DocumentNumbers (doc_no, order_id) VALUES ($1, $2)';
        await db.query(insertDocQuery, [docNo, order_id]);
        console.log("Document number inserted into database");
      } catch (error) {
        console.error("Error generating document number:", error);
        throw error;
      }
    }

    console.log("Final document number:", docNo);
    
    // Step 1: Retrieve stored tokens from the database
    const query = 'SELECT * FROM authTokens ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query);

    if (result.rows.length === 0) {
      throw new Error("No tokens found in the database.");
    }
    const { authtoken, sek } = result.rows[0];  // Fetch the most recent token
    const member_id = req.body.orderId.customer_id;
    console.log("member id", member_id);
    const memberResponse = await axios.get(`https://backend.bninewdelhi.com/api/getMember/${member_id}`);
    const memberData = memberResponse.data;
    const gstin = memberData.member_gst_number;

    if (!memberData || memberData.length === 0) {
      throw new Error("GST and address details not found.");
    }

    // Check for visitor payment without GSTIN
    const isVisitorPayment = req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment';
    const hasNoVisitorGstin = isVisitorPayment && (!req.body.orderId.visitor_gstin || req.body.orderId.visitor_gstin === 'N/A');

    // If GSTIN is 'N/A' or it's a visitor payment without GSTIN
    if (gstin === 'N/A' || hasNoVisitorGstin) {
      // Generate document number as usual (already done above)
      // Insert a record into einvoice table with null IRN fields
      const transaction_id = req.body.transactionId.transaction_id;
      await db.query(
        `INSERT INTO einvoice (
           order_id, transaction_id, member_id, ack_no, ack_dt, irn, qrcode, invoice_dt, is_gst_number
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [order_id, transaction_id, member_id, null, null, null, null, new Date(), false]
      );
      
      // Send email without IRN/QR/AckNo
      await processEmailSending(
        isVisitorPayment ? req.body.orderId.visitor_email : req.body.orderId.customer_email,
        req.body.orderId.order_id,
        req.body.amount,
        null, // irn
        null, // qrCode
        docNo,
        isVisitorPayment ? req.body.orderId.visitor_company : req.body.orderId.company,
        req,
        true // noIrn flag
      ).catch(err => {
        console.error("Error in background email processing (no IRN):", err);
      });

         // Update settlementstatus table
    await db.query('UPDATE transactions SET einvoice_generated = $1 WHERE order_id = $2', [true, order_id]);
      // Respond to frontend
      return res.status(200).json({
        message: hasNoVisitorGstin ? "Document generated successfully (no IRN, Visitor GSTIN not provided)" : "Document generated successfully (no IRN, GSTIN is N/A)",
        data: {
          ackNo: null,
          ackDate: null,
          irn: null,
          qrCode: null,
          documentNumber: docNo
        }
      });
    }

    const stateCode = gstin.substring(0, 2);

    // Populate address fields from member data
    const buyerDetails = {
      Addr1: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' 
        ? req.body.orderId.visitor_company_address 
        : (memberData.member_company_address || "Address not found"),
      Addr2: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_company_address
        : (memberData.member_company_address || ""),
      Loc: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? (req.body.orderId.visitor_state || "Delhi").padEnd(3, ' ')
        : (memberData.member_company_state || "Delhi").padEnd(3, ' '),
      Pos: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_gstin.substring(0, 2)
        : stateCode,
      Pin: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_pincode
        : (memberData.address_pincode || 110001),
      Stcd: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_gstin.substring(0, 2)
        : stateCode,
      Ph: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_mobilenumber
        : req.body.orderId.customer_phone,
      Em: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_email
        : req.body.orderId.customer_email,
      LglNm: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_company
        : req.body.orderId.company,
      TrdNm: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_company
        : req.body.orderId.company,
      Gstin: req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment'
        ? req.body.orderId.visitor_gstin
        : memberData.member_gst_number
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

    // Format the document number to match the required pattern
    const formattedDocNo = formatDocumentNumber(docNo);
    console.log("Original document number:", docNo);
    console.log("Formatted document number:", formattedDocNo);

    // Step 2: Encrypt the IRN data payload
    const payload = {
      type: "SEK",
      data: JSON.stringify({
        "Version": "1.1",
        "TranDtls": {
          "TaxSch": "GST",
          "SupTyp": "B2B",
          "RegRev": "N",
          "EcmGstin": null,
          "IgstOnIntra": "N"
        },
        "DocDtls": {
          "Typ": "INV",
          "No": docNo,  // Using the new document number format directly
          "Dt": docDate
        },
        "SellerDtls": {
          "Gstin": "07AHIPK0486D1ZH",
          "LglNm": "ADI CORPORATE TRAINING",
          "TrdNm": "ADI CORPORATE TRAINING",
          "Addr1": "Flat No.09, Pocket 1, Sector 19, Dwarka, Delhi",
          "Loc": "Dwarka, Delhi",  // Ensure location is properly set
          "Pin": 110075,
          "Stcd": "07",
          "Ph": "9899789340",
          "Em": "sunilk@bni-india.in"
        },
        "BuyerDtls": {
          ...buyerDetails,
          Loc: buyerDetails.Loc.substring(0, 100)  // Ensure maximum 100 characters
        },
        "ShipDtls": {
          ...buyerDetails,
          Loc: buyerDetails.Loc.substring(0, 100)  // Ensure maximum 100 characters
        },
        "ItemList": [
          {
            "SlNo": "1",
            "PrdDesc": req.body.universalLinkName || "BNI Payments",
            "IsServc": "Y",
            "HsnCd": "999511",
            "Barcde": null,
            "Qty": 1,
            "Unit": "Service",
            "UnitPrice": basePrice,
            "TotAmt": basePrice,
            "Discount": 0,
            "AssAmt": basePrice,
            "GstRt": 18.0,
            "IgstAmt": igstAmount,
            "CgstAmt": cgstAmount,
            "SgstAmt": sgstAmount,
            "TotItemVal": parseFloat(req.body.orderId.order_amount),
          }
        ],
        "ValDtls": {
          "AssVal": basePrice,
          "IgstVal":igstAmount,
          "CgstVal": cgstAmount,
          "SgstVal": sgstAmount,
          "TotInvVal": parseFloat(req.body.orderId.order_amount)
        },
        "PayDtls": {
          "Nm": req.body.gatewayName,
          "AccDet": "5697389713210",
          "Mode": "cash",
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
    INSERT INTO einvoice (order_id, transaction_id, member_id, ack_no, ack_dt, irn, qrcode, is_gst_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const transaction_id = req.body.transactionId.transaction_id; // Assuming transaction_id is in the request body
    await db.query(insertEInvoiceQuery, [
      order_id,
      transaction_id,
      member_id,
      decryptedDataa.AckNo,
      decryptedDataa.AckDt,
      decryptedDataa.Irn,
      decryptedDataa.SignedQRCode,
      true
    ]);

    console.log("IRN Data saved to einvoice table");

       // Update settlementstatus table
       await db.query('UPDATE transactions SET einvoice_generated = $1 WHERE order_id = $2', [true, order_id]);

    // Send success response to frontend first
    res.status(200).json({
      message: "IRN and QR code generated successfully",
      data: {
        ackNo: decryptedDataa.AckNo,
        ackDate: decryptedDataa.AckDt,
        irn: decryptedDataa.Irn,
        qrCode: decryptedDataa.SignedQRCode,
        documentNumber: docNo
      }
    });

    // Send email with e-invoice to the member asynchronously after response
    await processEmailSending(
      (req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment') 
        ? req.body.orderId.visitor_email 
        : req.body.orderId.customer_email,
      req.body.orderId.order_id,
      req.body.amount,
      decryptedDataa.Irn,
      decryptedDataa.SignedQRCode,
      docNo,
      (req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment')
        ? req.body.orderId.visitor_company
        : req.body.orderId.company,
      req
    ).catch(err => {
      console.error("Error in background email processing:", err);
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

// Function to generate PDF with e-invoice details
async function generateEInvoicePDF(orderId, amount, irn, qrCode, docNo, companyName) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a unique filename for the PDF
      const filename = `einvoice_${orderId}_${Date.now()}.pdf`;
      const pdfPath = path.join(__dirname, '../../temp', filename);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Create a new PDF document
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(pdfPath);
      
      doc.pipe(stream);
      
      // Add content to the PDF
      doc.fontSize(20).text('BNI E-Invoice', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Order ID: ${orderId}`);
      doc.text(`Company: ${companyName}`);
      doc.text(`Amount: ₹${amount}`);
      doc.text(`Document Number: ${docNo}`);
      doc.text(`IRN: ${irn}`);
      doc.moveDown();
      
      // Generate QR code image
      try {
        // Create a QR code image file
        const qrImagePath = path.join(tempDir, `qr_${orderId}_${Date.now()}.png`);
        
        // Generate QR code with the IRN data
        await QRCode.toFile(qrImagePath, irn, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 300
        });
        
        // Add the QR code image to the PDF
        doc.image(qrImagePath, { width: 150 });
        
        // Delete the temporary QR image file after adding to PDF
        fs.unlinkSync(qrImagePath);
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
        // Continue without the QR code if there's an error
        doc.text("QR Code could not be generated", { align: 'center' });
      }
      
      doc.moveDown();
      doc.text('Thank you for your business!', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
      
      stream.on('finish', () => {
        resolve(pdfPath);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Function to send email with e-invoice PDF
async function sendEInvoiceEmail(email, orderId, amount, irn, pdfPath) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "demobni009@gmail.com",
      pass: "vmsbihwbwhnktcws", // Replace with actual App Password
    },
  });
  
  // Email content
  const mailOptions = {
    from: '"BNI N E W Delhi" <demobni009@gmail.com>',
    to: email,
    cc: [
      "scriptforprince@gmail.com",
        "shini.sunil@adico.in",
        "sunil.k@adico.in",
        "singhi_bikash@yahoo.co.in",
        "support@bninewdelhi.com",
        "demobni009@gmail.com",
        "demobni009@gmail.com"
    ],
    subject: `E-Invoice for Order #${orderId}`,
    html: `
      <h2>Your E-Invoice is Ready</h2>
      <p>Dear Valued Member,</p>
      <p>Your e-invoice for order #${orderId} has been generated successfully.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Order ID: ${orderId}</li>
        <li>Amount: ₹${amount}</li>
        <li>IRN: ${irn}</li>
      </ul>
      <p>Please find the attached e-invoice PDF for your records.</p>
      <p>Thank you for your business!</p>
      <p>Best regards,<br>BNI New Delhi Team</p>
    `,
    attachments: [
      {
        filename: `einvoice_${orderId}.pdf`,
        path: pdfPath
      }
    ]
  };
  
  // Send email
  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent: %s", info.messageId);
  
  // Delete the temporary PDF file after sending
  fs.unlink(pdfPath, (err) => {
    if (err) console.error("Error deleting temporary PDF:", err);
    else console.log("Temporary PDF deleted successfully");
  });
  
  return info;
}

// Function to process email sending in the background
async function processEmailSending(email, orderId, amount, irn, qrCode, docNo, companyName, req, noIrn = false) {
  try {
    // Read the HTML template
    const templatePath = path.join(__dirname, '../../einvoice-handler/temp.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Get order details from database
    const orderQuery = `
      SELECT 
        o.*,
        COALESCE(m.member_company_address, o.visitor_company_address) as company_address,
        COALESCE(m.member_company_state, '') as company_state,
        COALESCE(m.member_gst_number, o.visitor_gstin) as gst_number,
        COALESCE(m.member_company_name, o.visitor_company) as company_name,
        COALESCE(m.member_first_name || ' ' || m.member_last_name, o.visitor_name) as full_name,
        COALESCE(o.company, o.visitor_company) as company,
        m.address_pincode,
        o.chapter_id,
        o.customer_id
      FROM orders o
      LEFT JOIN member m ON o.customer_id = m.member_id
      WHERE o.order_id = $1
    `;
    const orderResult = await db.query(orderQuery, [orderId]);
    const orderData = orderResult.rows[0];

    if (!orderData) {
      throw new Error(`Order not found for ID: ${orderId}`);
    }

    // Get member details for email
    const memberQuery = 'SELECT member_first_name, member_last_name FROM member WHERE member_id = $1';
    const memberResult = await db.query(memberQuery, [orderData.customer_id]);
    const memberName = memberResult.rows[0] ? 
      `${memberResult.rows[0].member_first_name} ${memberResult.rows[0].member_last_name}` : 
      'Valued Member';

    // Get chapter details
    let chapterName = 'Unknown Chapter';
    try {
      const chapterResponse = await axios.get(`https://backend.bninewdelhi.com/api/chapters`);
      const chapters = chapterResponse.data;
      const chapter = chapters.find(ch => ch.chapter_id === orderData.chapter_id);
      if (chapter) {
        chapterName = chapter.chapter_name;
      }
      console.log("Chapter found:", chapterName);
    } catch (chapterError) {
      console.error("Error fetching chapter details:", chapterError);
      // Continue with default chapter name
    }

    // Get IRN details from einvoice table
    const irnQuery = 'SELECT ack_no, ack_dt FROM einvoice WHERE irn = $1';
    const irnResult = await db.query(irnQuery, [irn]);
    const irnData = irnResult.rows[0];

    // Calculate tax amounts based on pincode
    const orderAmount = parseFloat(req.body.orderId.order_amount);
    const baseAmount = (orderAmount / 1.18).toFixed(2);
    const totalTax = (orderAmount - parseFloat(baseAmount)).toFixed(2);
    let cgst = '0.00', sgst = '0.00', igst = '0.00';

    // Check if pincode is from Delhi
    const isDelhiPincode = delhiZipCodes.includes(orderData.address_pincode);
    
    console.log('=== Debug Values ===');
    console.log('Order Amount:', orderAmount);
    console.log('Base Amount:', baseAmount);
    console.log('Total Tax:', totalTax);
    console.log('Is Delhi Pincode:', isDelhiPincode);
    console.log('Pincode:', orderData.address_pincode);
    console.log('Universal Link Name:', req.body.universalLinkName);

    if (isDelhiPincode) {
      cgst = (totalTax / 2).toFixed(2);
      sgst = (totalTax / 2).toFixed(2);
      console.log('CGST:', cgst);
      console.log('SGST:', sgst);
    } else {
      igst = totalTax;
      console.log('IGST:', igst);
    }

    // Get current date in DD/MM/YYYY format
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Get payment method details from request body
    const paymentMethod = req.body.transactionId?.payment_method 
      ? Object.keys(req.body.transactionId.payment_method)[0] 
      : 'Online';

    // Convert amount to words
    const amountInWords = numberToWords(orderAmount);
    console.log('Amount in Words:', amountInWords);

    // Generate QR code
    let qrCodeDataUrl = '';
    if (!noIrn && qrCode) {
      qrCodeDataUrl = await QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 150
      });
    }

    // Create a copy of the template and replace placeholders
    let updatedTemplate = htmlTemplate
      .replace('class="qr_code" src=""', `class="qr_code" src="${qrCodeDataUrl}"`)
      .replace('class="irn_number">', `class="irn_number">${irn || ''}`)
      .replace('class="ack_no">', `class="ack_no">${irnData?.ack_no || ''}`)
      .replace('class="ack_date">', `class="ack_date">${irnData?.ack_dt ? new Date(irnData.ack_dt).toLocaleDateString('en-GB') : currentDate}`)
      .replace('class="invoice_date">', `class="invoice_date">${currentDate}`)
      .replace('class="doc_number">', `class="doc_number">${docNo}`)
      .replace('class="payment_mode">', `class="payment_mode">${paymentMethod}`)
      .replace('class="bill_to_name"><strong>', `class="bill_to_name"><strong>${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_name : orderData.full_name}`)
      .replace('class="bill_to_company"><strong>', `class="bill_to_company"><strong>${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_company : orderData.company}`)
      .replace('class="bill_to_address">', `class="bill_to_address">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_company_address : orderData.company_address}`)
      .replace('class="bill_to_gst">', `class="bill_to_gst">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_gstin : orderData.gst_number}`)
      .replace('class="bill_to_state">', `class="bill_to_state">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_state || 'Delhi' : orderData.company_state || 'Delhi'}`)
      .replace('class="ship_to_company"><strong>', `class="ship_to_company"><strong>${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_company : orderData.company}`)
      .replace('class="ship_to_address">', `class="ship_to_address">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_company_address : orderData.company_address}`)
      .replace('class="ship_to_gst">', `class="ship_to_gst">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_gstin : orderData.gst_number}`)
      .replace('class="ship_to_state">', `class="ship_to_state">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_state || 'Delhi' : orderData.company_state || 'Delhi'}`)
      .replace('class="transaction_id">', `class="transaction_id">${req.body.transactionId?.cf_payment_id || 'N/A'}`)
      .replace('class="order_id">', `class="order_id">${orderId}`)
      .replace('class="buyer_email">', `class="buyer_email">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_email : (orderData.customer_email || email)}`)
      .replace('class="buyer_phone">', `class="buyer_phone">${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_mobilenumber : orderData.customer_phone}`);

    // If noIrn is true, hide IRN, QR code, and Ack No sections using display:none
    if (noIrn) {
      // Hide QR code image
      updatedTemplate = updatedTemplate.replace(/(<img[^>]*class=\"qr_code\"[^>]*)(>)/g, '$1 style="display:none;"$2');
      // Hide IRN, Ack No, and Ack Date fields (span/divs with class irn_number, ack_no, ack_date)
      updatedTemplate = updatedTemplate.replace(/(<[^>]*class=\"irn_number\"[^>]*)(>)/g, '$1 style="display:none;"$2');
      updatedTemplate = updatedTemplate.replace(/(<[^>]*class=\"ack_no\"[^>]*)(>)/g, '$1 style="display:none;"$2');
      updatedTemplate = updatedTemplate.replace(/(<[^>]*class=\"ack_date\"[^>]*)(>)/g, '$1 style="display:none;"$2');
      updatedTemplate = updatedTemplate.replace(/(<div[^>]*class="[^"]*irn_block[^"]*"[^>]*)(>)/g, '$1 style="display:none;"$2');
    }

    // Add CSS and JavaScript
    let particularsText = req.body.universalLinkName || 'BNI Payment';
    console.log('req.body.universalLinkName', req.body.universalLinkName);
    if (req.body.universalLinkName === 'Meeting Payments' && req.body.orderId?.chapter_id && req.body.orderId?.kitty_bill_id) {
      try {
        // Fetch all kitty bills
        const kittyRes = await axios.get('https://backend.bninewdelhi.com/api/getAllKittyPayments');
        console.log('Fetched kitty bills:', kittyRes.data);
        if (kittyRes.data && kittyRes.data.length > 0) {
          // Force both to numbers and log for debugging
          const chapterId = Number(req.body.orderId.chapter_id);
          const kittyBillId = Number(req.body.orderId.kitty_bill_id);
          console.log('Looking for chapter_id:', chapterId, 'kitty_bill_id:', kittyBillId);
          const kitty = kittyRes.data.find(
            k => Number(k.chapter_id) === chapterId && Number(k.kitty_bill_id) === kittyBillId
          );
          console.log('Matched kitty bill:', kitty);
          if (kitty) {
            particularsText = `<b>Meeting Payment</b><br><b>Bill Type:</b> ${kitty.bill_type || ''}<br><b>Month:</b> ${kitty.description || ''}<br><b>Total Weeks:</b> ${kitty.total_weeks || ''}`;
          } else {
            console.error('No matching kitty bill found!');
            particularsText = 'Meeting Payment';
          }
        }
      } catch (err) {
        console.error('Error fetching kitty bill details:', err.message);
        particularsText = 'Meeting Payment';
      }
    }
    // Escape for JS string literal
    const safeParticularsText = particularsText.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const updatedTemplateWithStyles = updatedTemplate.replace('</head>', 
      `<style>
        ${isDelhiPincode ? '.igst-row { display: none; }' : '.cgst-row, .sgst-row { display: none; }'}
        .text-end { text-align: right; }
        .text-center { text-align: center; }
        td { padding: 8px; }
        .table { width: 100%; border-collapse: collapse; }
        .border { border: 1px solid #dee2e6; }
      </style>
      <script>
        window.onload = function() {
          document.getElementById('particulars').innerHTML = "${safeParticularsText}";
          document.getElementById('rate').textContent = '₹${baseAmount}';
          document.getElementById('amount').textContent = '₹${baseAmount}';
          document.getElementById('taxable_value').textContent = '₹${baseAmount}';
          document.getElementById('cgst').textContent = '₹${cgst}';
          document.getElementById('sgst').textContent = '₹${sgst}';
          document.getElementById('igst').textContent = '₹${igst}';
          document.getElementById('grand_total').textContent = '₹${orderAmount.toFixed(2)}';
          document.getElementById('amount_in_words').textContent = '${amountInWords}';
        }
      </script>
      </head>`);

    // Create a PDF from the HTML
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions'
      ]
    });
    const page = await browser.newPage();
    
    // Set content and wait for JavaScript execution
    await page.setContent(updatedTemplateWithStyles);
    await page.waitForFunction(() => document.getElementById('particulars').textContent !== '');
    
    // Generate PDF
    const pdfPath = path.join(__dirname, '../../temp', `einvoice_${orderId}_${Date.now()}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "demobni009@gmail.com",
        pass: "vmsbihwbwhnktcws", // Replace with actual App Password
      },
    });

    // Send email with the generated PDF
    const mailOptions = {
      from: '"BNI N E W Delhi" <demobni009@gmail.com>',
      to: email,
      cc: [
        "scriptforprince@gmail.com",
        "shini.sunil@adico.in",
        "sunil.k@adico.in",
        "singhi_bikash@yahoo.co.in",
        "support@bninewdelhi.com",
        "demobni009@gmail.com",
        "demobni009@gmail.com"
      ],
      subject: `Invoice for ${req.body.universalLinkName || 'BNI Payment'}(${chapterName}) - ${docNo}`,
      html: `
        <h2>Your Invoice is Ready</h2>
        <p>Dear <b>${req.body.orderId.payment_note === 'visitor-payment' || req.body.orderId.payment_note === 'Visitor Payment' ? req.body.orderId.visitor_name : memberName}</b>,</p>
        <p>Your invoice for the following transaction has been generated successfully.</p>
        <p><strong>Invoice Details:</strong></p>
        <ul>
          <li><b>Chapter Name:</b> ${chapterName}</li>
          <li><b>Transaction ID:</b> ${req.body.transactionId?.cf_payment_id || 'N/A'}</li>
          <li><b>Order ID:</b> ${orderId}</li>
          <li><b>Amount:</b> ₹${orderAmount}</li>
          <li><b>IRN:</b> ${irn}</li>
          <li><b>Invoice Date:</b> ${irnData?.ack_dt ? new Date(irnData.ack_dt).toLocaleDateString('en-GB') : currentDate}</li>
          <li><b>Payment Method:</b> ${paymentMethod}</li>
        </ul>
        <p>Please find the attached invoice PDF for your records.</p>
        <p>Thank you for your business!</p>
        <p>Best Regards,<br>BNI N E W Delhi</p>
      `,
      attachments: [
        {
          filename: `einvoice_${orderId}.pdf`,
          path: pdfPath
        }
      ]
    };
    
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");

    // Delete the temporary PDF file after sending
    fs.unlink(pdfPath, (err) => {
      if (err) console.error("Error deleting temporary PDF:", err);
      else console.log("Temporary PDF deleted successfully");
    });

  } catch (error) {
    console.error("Error in email processing:", error);
    throw error;
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

      await db.query('UPDATE einvoice SET is_cancelled = $1 WHERE order_id = $2', [true, order_id]);


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


async function fetchGstDetails(gstNo, authToken, sek) {
  try {
    const gstResponse = await apiClient.get(`/eivital/v1.04/Master/gstin/${gstNo}`, {
      headers: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        gstin: process.env.GSTIN,
        user_name: "sunilk",
        AuthToken: authToken
      }
    });

    if (!gstResponse.data || !gstResponse.data.Data) {
      return { gstin: gstNo, error: "Invalid response from GST API." };
    }

    const decryptResponse = await apiClient.post('/crypto/decrypt', {
      type: "SEK",
      data: gstResponse.data.Data,
      key: sek
    }, {
      headers: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        gstin: process.env.GSTIN,
        user_name: "sunilk",
        AuthToken: authToken
      }
    });

    let gstDetails = decryptResponse.data.Data;
    if (typeof gstDetails === 'string') {
      gstDetails = JSON.parse(gstDetails);
    }

    if (!gstDetails || typeof gstDetails !== 'object') {
      return { gstin: gstNo, error: "Invalid GST details format." };
    }

    return {
      gstin: gstDetails.gstin || "N/A",
      tradeName: gstDetails.tradeName || "N/A",
      legalName: gstDetails.legalName || "N/A",
      address: `${gstDetails.addrBno || "N/A"}, ${gstDetails.addrFlno || "N/A"}, ${gstDetails.addrSt || "N/A"}, ${gstDetails.addrLoc || "N/A"}, ${gstDetails.stateCode || "N/A"} - ${gstDetails.addrPncd || "N/A"}`,
      taxpayerType: gstDetails.txpType || "N/A",
      status: gstDetails.status || "N/A",
      registrationDate: gstDetails.dtReg || "N/A"
    };

  } catch (err) {
    return { gstin: gstNo, error: err.message };
  }
}


async function getMultipleGstDetails(gstNumbers) {
  const query = 'SELECT * FROM authTokens ORDER BY created_at DESC LIMIT 1';
  const result = await db.query(query);

  if (result.rows.length === 0) {
    throw new Error("No tokens found in the database.");
  }

  const { authtoken, sek } = result.rows[0];

  const promises = gstNumbers.map(gstNo =>
    fetchGstDetails(gstNo, authtoken, sek)
  );

  const allResults = await Promise.all(promises);
  return allResults;
}


async function updateMemberDetailsFromGst(gstDetailsList) {
  const updatePromises = gstDetailsList.map(async (details) => {
    if (details.error) {
      console.log(`Skipping GSTIN ${details.gstin} due to error: ${details.error}`);
      return;
    }

    const updateQuery = `
      UPDATE member
      SET
        member_company_name = $1,
        member_company_address = $2
      WHERE member_gst_number = $3
    `;

    try {
      await db.query(updateQuery, [
        details.tradeName,
        details.address,
        details.gstin
      ]);
      console.log(`Updated member for GSTIN: ${details.gstin}`);
    } catch (err) {
      console.error(`Error updating member for GSTIN ${details.gstin}:`, err.message);
    }
  });

  await Promise.all(updatePromises);
}



module.exports = { getToken, generateIRN, cancelIRN, getGstDetails, fetchGstDetails, getMultipleGstDetails, updateMemberDetailsFromGst};