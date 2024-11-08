require('dotenv').config();
const axios = require('axios');
const db = require('../../database/db');
const { Client } = require('pg');  // Import PostgreSQL client
const crypto = require('crypto');

// Initialize Axios client with base URL and headers
const apiClient = axios.create({
  baseURL: 'https://api.sandbox.core.irisirp.com',
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
        UserName: "PrinceSachdeva",
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

async function generateIRN() {
  try {
    // Step 1: Retrieve stored tokens from the database
    const query = 'SELECT * FROM authTokens ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query);

    if (result.rows.length === 0) {
      throw new Error("No tokens found in the database.");
    }

    const { authtoken, sek } = result.rows[0];  // Fetch the most recent token

    // Print the authToken and sek to the console
    console.log("AuthToken:", authtoken);
    console.log("SEK:", sek);

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
          "No": "DOC/022",
          "Dt": "07/11/2024"
        },
        "SellerDtls": {
          "Gstin": "07EVVPS9453K001",
          "LglNm": "NIC company pvt ltd",
          "TrdNm": "NIC Industries",
          "Addr1": "5th block, kuvempu layout",
          "Addr2": "kuvempu layout",
          "Loc": "GANDHINAGAR",
          "Pin": 110001,
          "Stcd": "07",
          "Ph": "9000000000",
          "Em": "abc@gmail.com"
        },
        "BuyerDtls": {
          "Gstin": "07EVVPS9453K3Z9",
          "LglNm": "XYZ company pvt ltd",
          "TrdNm": "XYZ Industries",
          "Pos": "12",
          "Addr1": "7th block, kuvempu layout",
          "Addr2": "kuvempu layout",
          "Loc": "GANDHINAGAR",
          "Pin": 110001,
          "Stcd": "07",
          "Ph": "91111111111",
          "Em": "xyz@yahoo.com"
        },
        "DispDtls": {
          "Nm": "ABC company pvt ltd",
          "Addr1": "7th block, kuvempu layout",
          "Addr2": "kuvempu layout",
          "Loc": "Banagalore",
          "Pin": 110001,
          "Stcd": "07"
        },
        "ShipDtls": {
          "Gstin": "07EVVPS9453K3Z9",
          "LglNm": "CBE company pvt ltd",
          "TrdNm": "kuvempu layout",
          "Addr1": "7th block, kuvempu layout",
          "Addr2": "kuvempu layout",
          "Loc": "Banagalore",
          "Pin": 110001,
          "Stcd": "07"
        },
        "ItemList": [
          {
            "SlNo": "1",
            "PrdDesc": "Rice",
            "IsServc": "N",
            "HsnCd": "1001",
            "Barcde": "123456",
            "Qty": 100.345,
            "FreeQty": 10,
            "Unit": "BAG",
            "UnitPrice": 99.545,
            "TotAmt": 9988.84,
            "Discount": 10,
            "PreTaxVal": 1,
            "AssAmt": 9978.84,
            "GstRt": 12.0,
            "IgstAmt": 1197.46,
            "CgstAmt": 0,
            "SgstAmt": 0,
            "CesRt": 5,
            "CesAmt": 498.94,
            "CesNonAdvlAmt": 10,
            "StateCesRt": 12,
            "StateCesAmt": 1197.46,
            "StateCesNonAdvlAmt": 5,
            "OthChrg": 10,
            "TotItemVal": 12897.7,
            "OrdLineRef": "3256",
            "OrgCntry": "AG",
            "PrdSlNo": "12345",
            "BchDtls": {
              "Nm": "123456",
              "ExpDt": "01/08/2020",
              "WrDt": "01/09/2020"
            },
            "AttribDtls": [
              {
                "Nm": "Rice",
                "Val": "10000"
              }
            ]
          }
        ],
        "ValDtls": {
          "AssVal": 9978.84,
          "CgstVal": 0,
          "SgstVal": 0,
          "IgstVal": 1197.46,
          "CesVal": 508.94,
          "StCesVal": 1202.46,
          "Discount": 10,
          "OthChrg": 20,
          "RndOffAmt": 0.3,
          "TotInvVal": 12908,
          "TotInvValFc": 12897.7
        },
        "PayDtls": {
          "Nm": "ABCDE",
          "AccDet": "5697389713210",
          "Mode": "Cash",
          "FinInsBr": "SBIN11000",
          "PayTerm": "100",
          "PayInstr": "Gift",
          "CrTrn": "test",
          "DirDr": "test",
          "CrDay": 100,
          "PaidAmt": 10000,
          "PaymtDue": 5000
        },
        "RefDtls": {
          "InvRm": "TEST",
          "DocPerdDtls": {
            "InvStDt": "01/08/2024",
            "InvEndDt": "01/09/2024"
          },
          "PrecDocDtls": [
            {
              "InvNo": "DOC/002",
              "InvDt": "01/11/2024",
              "OthRefNo": "123456"
            }
          ],
          "ContrDtls": [
            {
              "RecAdvRefr": "Doc/003",
              "RecAdvDt": "01/11/2024",
              "TendRefr": "Abc001",
              "ContrRefr": "Co123",
              "ExtRefr": "Yo456",
              "ProjRefr": "Doc-456",
              "PORefr": "Doc-789",
              "PORefDt": "12/11/2024"
            }
          ]
        },
        "AddlDocDtls": [
          {
            "Url": "https://einv-apisandbox.nic.in",
            "Docs": "Test Doc",
            "Info": "Document Test"
          }
        ],
        "ExpDtls": {
          "ShipBNo": "A-248",
          "ShipBDt": "01/11/2024",
          "Port": "INABG1",
          "RefClm": "N",
          "ForCur": "AED",
          "CntCode": "AE",
          "ExpDuty": null
        },
        "EwbDtls": {
          "TransId": "12AWGPV7107B1Z1",
          "TransName": "XYZ EXPORTS",
          "Distance": 100,
          "TransDocNo": "DOC01",
          "TransDocDt": "10/11/2024",
          "VehNo": "ka123456",
          "VehType": "R",
          "TransMode": "1"
        }
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
        user_name: "PrinceSachdeva",
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
        user_name: "PrinceSachdeva",
        AuthToken: authtoken
      }
    });

    console.log("IRN Generation Response:", irnResponse.data);

    const decryptedData = await decryptIrnData(irnResponse.data.Data, sek);  // Ensure to pass the encrypted data properly
    console.log("Decrypted IRN Data:", decryptedData);



    return decryptedData;

  } catch (error) {
    console.error("IRN Generation Error:", error.message);
    throw new Error("Failed to generate IRN");
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




module.exports = { getToken, generateIRN };
