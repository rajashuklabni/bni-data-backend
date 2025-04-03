// db.js
const { Client } = require('pg');

// Replace with your Render database credentials
const db = new Client({
  host: "dpg-cs0d2hi3esus739088bg-a.oregon-postgres.render.com",
  user: "bni_dashboard_backend_database_user",
  port: 5432,
  password: "8UGkmCixOpO5Gb89BSBI8aPPapoAW6fD",
  database: "bni_dashboard_backend_database",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Connect to the database
db.connect()
  .then(() => console.log("Connected to render PostgreSQL"))
  .catch(err => console.error("Connection error", err.stack));

// Export the connection for use in other files
module.exports = db;
