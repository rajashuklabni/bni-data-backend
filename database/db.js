// db.js
const { Client } = require('pg');

// Replace with your Render database credentials
const db = new Client({
  host: "54.39.51.161",
  user: "bni_dashboard_backend_database_user",
  port: 7546,
  password: "WW14XjfGlkDuGD5",
  database: "bni_dashboard_backend_database",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Connect to the database
db.connect()
  .then(() => console.log("Connected to BNI PostgreSQL"))
  .catch(err => console.error("Connection error", err.stack));

// Export the connection for use in other files
module.exports = db;
