const axios = require("axios");

const CLIENT_ID = "iI/gHJr1SIq/ELKZ9km1Y3huthLGS+T2";
const CLIENT_SECRET = "x1a/+SBiUU9ehZS5XyXnx4zibZOWQ3Qx";
const GSTIN = "07EVVPS9453K000";

// Function to fetch authentication token
const getAuthToken = async () => {
    try {
        
        const response = await axios.post("https://api.sandbox.core.irisirp.com/eivital/v1.04/auth", {}, {
            headers: {
                'Content-Type': 'application/json',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                gstin: GSTIN
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching auth token:", error);
        throw error;
    }
};


module.exports = {
    getAuthToken
};
