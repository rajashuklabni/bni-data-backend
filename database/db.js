// db.js
const { Client, Pool } = require('pg');
const dotEnv = require("dotenv");
dotEnv.config(); 

// Create a pool for new transactions
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Keep existing client for backward compatibility
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

// Test pool connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("Pool connection error", err.stack);
  } else {
    console.log("Pool connected to PostgreSQL");
  }
});

// Export both client and pool
module.exports = {
  db,  // Original client for backward compatibility
  pool // New pool for transactions
};
