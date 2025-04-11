// db.js
const { Client } = require('pg');
const dotEnv = require("dotenv");

// Replace with your Render database credentials
const db = new Client({
  host: process.env.HOST,
  user: process.env.USER,
  port: process.env.PORT,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
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
