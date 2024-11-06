require('dotenv').config();
const axios = require('axios');

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

// Get token function for handling request
exports.getToken = async (req, res) => {
  try {
    // Step 1: Encrypt data
    const encryptedData = await encryptData();
    console.log("Encrypted Data:", encryptedData);

    // Step 2: Authenticate using encrypted data
    const { AuthToken, Sek } = await authenticateUser(encryptedData);
    console.log("Auth Token:", AuthToken);

    // Optionally, decrypt SEK if necessary
    const decryptedSek = await decryptData(AuthToken, Sek);
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
