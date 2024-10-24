const axios=require('axios')

const sessionIdGenerator = async (req, res) => {
  const headers = {
      'x-client-id': process.env.x_client_id,  // Replace with your client ID
      'x-client-secret': process.env.x_client_secret,  // Replace with your client secret
      'x-api-version': process.env.x_api_version,
  };

  const data = req.body;
  console.log("================",data)

  try {
      const axiosResponse = await axios.post("https://sandbox.cashfree.com/pg/orders", data, { headers });
      res.json(axiosResponse.data); // Handle the response data correctly
  } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Something went wrong try again!' }); // Send an error response
  }
};

module.exports = {
   sessionIdGenerator
  };