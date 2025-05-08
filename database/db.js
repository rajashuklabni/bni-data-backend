// db.js
const { Client } = require('pg');
const dotEnv = require("dotenv");

// Replace with your Render database credentials
const db = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Connect to the database
db.connect()
  .then(() => console.log("Connected to new BNI server PostgreSQL"))
  .catch(err => console.error("Connection error", err.stack));

// Export the connection for use in other files
module.exports = db;
