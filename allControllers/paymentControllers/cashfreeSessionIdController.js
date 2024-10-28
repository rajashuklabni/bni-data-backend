const axios=require('axios')

const headers = {
    'x-client-id': process.env.x_client_id,  // Replace with your client ID
    'x-client-secret': process.env.x_client_secret,  // Replace with your client secret
    'x-api-version': process.env.x_api_version,
};

// generate cashfree sessionId
const sessionIdGenerator = async (req, res) => {
    const data= req.body; // Access the data directly
  
  try {
      const axiosResponse = await axios.post(`${process.env.cashfree_testing_url}/pg/orders`, data, { headers });
   
      res.json(axiosResponse.data); // Handle the response data correctly
  } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Something went wrong try again!' }); // Send an error response
  }
};

const getOrderStatus = async (req, res) => {
    const { order_id } = req.params; // Extract order_id from req.params
  
    try {
      const getOrderData = await axios.get(
        `${process.env.cashfree_testing_url}/pg/orders/${order_id}/payments`,
        { headers } // Corrected axios method and header placement
      );
      
      console.log(getOrderData.data); // Log the data property
  
      // Send the response back to the client
      res.json(getOrderData.data);
    } catch (error) {
      console.error("Error fetching order data:", error.message);
      res.status(500).json({ error: "Error fetching order data" }); // Send error response
    }
  };
  

module.exports = {
   sessionIdGenerator,
   getOrderStatus
  };