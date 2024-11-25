const bcrypt = require("bcrypt");
const db = require("../../database/db"); // Ensure this is correctly configured for PostgreSQL
const sendMail = require("../../config/mailConfig/mailconfig"); // Adjust the import if necessary
const LoginMailOption = require("../../config/mailOptions/loginMailOptions"); // Adjust the import if necessary

const loginController = async (req, res) => {
  try {
    // Extract username and password from the request body
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Username and password are required.",
      });
    }

    // Query the database for the user
    const query = "SELECT user_id, username, password_hash FROM users WHERE email = $1 OR username = $1";
    const result = await db.query(query, [username]);

    // Check if user exists
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "User not found.",
      });
    }

    const user = result.rows[0];
    const { password_hash } = user;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Invalid credentials.",
      });
    }

    // Store OTP in the database
    const storeOtpQuery = `
      INSERT INTO otp_verification (user_id, otp_code, is_used, generated_at, expires_at)
      VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '10 minutes') 
      RETURNING *;
    `;
  
    // Generate the OTP and other required fields
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    const isUsed = false; // Set as unused by default
  
    // Insert the OTP into the database
    const otpResult = await db.query(storeOtpQuery, [user.user_id, otpCode, isUsed]);
  
    // Log the result for debugging
    console.log("Inserted OTP Record:", otpResult.rows[0]);

    const message = "Your OTP to login to your dashboard";

    // Generate email options
    const mailOptions = LoginMailOption(user.email || username, message, username, otpCode);

    // Send email
    await sendMail(mailOptions);

   

    // Respond with success and session data
    res.status(200).json({
      success: true,
      error: false,
      message: "Login successful. OTP sent to your email.",
      data: { userId: user.user_id, username: user.username },
    });
  } catch (error) {
    console.error("Error in loginController:", error);
    res.status(500).json({
      success: false,
      error: true,
      message: "An unexpected error occurred.",
    });
  }
};

// =========================================================================

const verifyOtpController = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    console.log(userId, otp);

    // Validate input
    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "User ID and OTP are required.",
      });
    }

    const query = `
    SELECT * 
    FROM otp_verification 
    WHERE user_id = $1
    AND is_used=false
    ORDER BY otp_id DESC
`;
    
const result = await db.query(query, [userId]);

// Get the first OTP record (most recent one) from the result
const otpRecord = result.rows[0];
console.log(otpRecord);
    // Check if OTP exists and is valid
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid or expired OTP.",
      });
    }

    if (otpRecord.is_used === true) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "OTP used generate new one",
      });
    }

    // Verify the entered OTP matches the generated OTP
    if (otpRecord.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Incorrect OTP.",
      });
    }

    // Mark OTP as used
    const updateOtpQuery = "UPDATE otp_verification SET is_used = true WHERE otp_id = $1";
    await db.query(updateOtpQuery, [otpRecord.otp_id]);

    //  Store user information in session after successful login
    // req.session.user = {
    //   user_id: user.user_id,
    //   username: user.username,
    // };


    // Respond with success
    res.status(200).json({
      success: true,
      error: false,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("Error in verifyOtpController:", error);
    res.status(500).json({
      success: false,
      error: true,
      message: "An unexpected error occurred.",
    });
  }
};

module.exports = {
  loginController,
  verifyOtpController,
};